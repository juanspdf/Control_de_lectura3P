import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaService } from '@/config/prisma.service';
import { RabbitMQService } from '@/config/rabbitmq.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService, RabbitMQService],
})
export class OrdersModule {}
