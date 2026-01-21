import { Controller, Post, Get, Body, Param, ValidationPipe, Logger, HttpStatus, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('api/v1/orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body(ValidationPipe) createOrderDto: CreateOrderDto) {
    this.logger.log(`Received request to create order for customer: ${createOrderDto.customerId}`);
    return this.ordersService.createOrder(createOrderDto);
  }

  @Get(':orderId')
  @HttpCode(HttpStatus.OK)
  async getOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    this.logger.log(`Received request to get order: ${orderId}`);
    return this.ordersService.getOrderById(orderId);
  }
}
