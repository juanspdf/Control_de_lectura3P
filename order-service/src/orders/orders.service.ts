import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/config/prisma.service';
import { RabbitMQService } from '@/config/rabbitmq.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { v4 as uuidv4 } from 'uuid';
import {
  OrderCreatedEvent,
  StockReservedEvent,
  StockRejectedEvent,
} from '@/common/interfaces/events.interface';

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async onModuleInit() {
    await this.subscribeToEvents();
  }

  async createOrder(createOrderDto: CreateOrderDto) {
    try {
      const correlationId = uuidv4();

      const order = await this.prisma.order.create({
        data: {
          customerId: createOrderDto.customerId,
          status: 'PENDING',
          shippingCountry: createOrderDto.shippingAddress.country,
          shippingCity: createOrderDto.shippingAddress.city,
          shippingStreet: createOrderDto.shippingAddress.street,
          shippingPostalCode: createOrderDto.shippingAddress.postalCode,
          paymentReference: createOrderDto.paymentReference,
          correlationId,
          items: {
            create: createOrderDto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      this.logger.log(`Order created with ID: ${order.id}`);

      const event: OrderCreatedEvent = {
        eventType: 'OrderCreated',
        orderId: order.id,
        correlationId: order.correlationId,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      await this.rabbitMQ.publish(
        process.env.RABBITMQ_ROUTING_KEY_ORDER_CREATED || 'order.created',
        event,
      );

      this.logger.log(`OrderCreated event published for order: ${order.id}`);

      return order;
    } catch (error) {
      this.logger.error('Error creating order', error);
      throw error;
    }
  }

  async getOrderById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return order;
  }

  private async subscribeToEvents() {
    await this.rabbitMQ.consume(
      this.rabbitMQ.getResponseQueue(),
      async (message: StockReservedEvent | StockRejectedEvent) => {
        if (message.eventType === 'StockReserved') {
          await this.handleStockReserved(message);
        } else if (message.eventType === 'StockRejected') {
          await this.handleStockRejected(message);
        }
      },
    );
  }

  private async handleStockReserved(event: StockReservedEvent) {
    try {
      this.logger.log(`Handling StockReserved event for order: ${event.orderId}`);

      await this.prisma.order.update({
        where: { id: event.orderId },
        data: { status: 'CONFIRMED' },
      });

      this.logger.log(`Order ${event.orderId} confirmed successfully`);
    } catch (error) {
      this.logger.error(`Error handling StockReserved event`, error);
    }
  }

  private async handleStockRejected(event: StockRejectedEvent) {
    try {
      this.logger.log(
        `Handling StockRejected event for order: ${event.orderId}, reason: ${event.reason}`,
      );

      await this.prisma.order.update({
        where: { id: event.orderId },
        data: { 
          status: 'CANCELLED',
        },
      });

      this.logger.log(`Order ${event.orderId} cancelled due to: ${event.reason}`);
    } catch (error) {
      this.logger.error(`Error handling StockRejected event`, error);
    }
  }
}
