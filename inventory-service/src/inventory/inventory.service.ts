import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/config/prisma.service';
import { RabbitMQService } from '@/config/rabbitmq.service';
import {
  OrderCreatedEvent,
  StockReservedEvent,
  StockRejectedEvent,
} from '@/common/interfaces/events.interface';

@Injectable()
export class InventoryService implements OnModuleInit {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async onModuleInit() {
    await this.subscribeToOrderCreated();
  }

  private async subscribeToOrderCreated() {
    await this.rabbitMQ.consume(
      this.rabbitMQ.getOrdersCreatedQueue(),
      async (message: OrderCreatedEvent) => {
        await this.handleOrderCreated(message);
      },
    );
  }

  private async handleOrderCreated(event: OrderCreatedEvent) {
    try {
      this.logger.log(`Processing OrderCreated event for order: ${event.orderId}`);

      const stockChecks = await Promise.all(
        event.items.map(async (item) => {
          const productStock = await this.prisma.productStock.findUnique({
            where: { productId: item.productId },
          });

          if (!productStock) {
            return {
              productId: item.productId,
              available: false,
              reason: `Product ${item.productId} not found`,
            };
          }

          const availableStock = productStock.availableStock - productStock.reservedStock;
          
          if (availableStock < item.quantity) {
            return {
              productId: item.productId,
              available: false,
              reason: `Insufficient stock for product ${item.productId}. Available: ${availableStock}, Requested: ${item.quantity}`,
            };
          }

          return {
            productId: item.productId,
            available: true,
            quantity: item.quantity,
          };
        }),
      );

      const unavailableProducts = stockChecks.filter((check) => !check.available);

      if (unavailableProducts.length > 0) {
        const reasons = unavailableProducts.map((p) => p.reason).join('; ');
        
        const rejectedEvent: StockRejectedEvent = {
          eventType: 'StockRejected',
          orderId: event.orderId,
          correlationId: event.correlationId,
          reason: reasons,
        };

        await this.rabbitMQ.publish(
          process.env.RABBITMQ_ROUTING_KEY_STOCK_REJECTED || 'stock.rejected',
          rejectedEvent,
        );

        this.logger.log(`Stock rejected for order: ${event.orderId}. Reason: ${reasons}`);
        return;
      }

      await this.prisma.$transaction(
        event.items.map((item) =>
          this.prisma.productStock.update({
            where: { productId: item.productId },
            data: {
              reservedStock: {
                increment: item.quantity,
              },
            },
          }),
        ),
      );

      const reservedEvent: StockReservedEvent = {
        eventType: 'StockReserved',
        orderId: event.orderId,
        correlationId: event.correlationId,
        reservedItems: event.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      await this.rabbitMQ.publish(
        process.env.RABBITMQ_ROUTING_KEY_STOCK_RESERVED || 'stock.reserved',
        reservedEvent,
      );

      this.logger.log(`Stock reserved successfully for order: ${event.orderId}`);
    } catch (error) {
      this.logger.error(`Error handling OrderCreated event`, error);
      
      const rejectedEvent: StockRejectedEvent = {
        eventType: 'StockRejected',
        orderId: event.orderId,
        correlationId: event.correlationId,
        reason: `Internal error: ${error.message}`,
      };

      await this.rabbitMQ.publish(
        process.env.RABBITMQ_ROUTING_KEY_STOCK_REJECTED || 'stock.rejected',
        rejectedEvent,
      );
    }
  }

  async getProductStock(productId: string) {
    const productStock = await this.prisma.productStock.findUnique({
      where: { productId },
    });

    if (!productStock) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return {
      productId: productStock.productId,
      availableStock: productStock.availableStock,
      reservedStock: productStock.reservedStock,
      actuallyAvailable: productStock.availableStock - productStock.reservedStock,
      updatedAt: productStock.updatedAt.toISOString(),
    };
  }

  async getAllProducts() {
    const products = await this.prisma.productStock.findMany({
      orderBy: {
        productId: 'asc',
      },
    });

    return products.map((product) => ({
      productId: product.productId,
      availableStock: product.availableStock,
      reservedStock: product.reservedStock,
      actuallyAvailable: product.availableStock - product.reservedStock,
      updatedAt: product.updatedAt.toISOString(),
    }));
  }
}
