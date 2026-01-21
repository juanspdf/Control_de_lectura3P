import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaService } from '@/config/prisma.service';
import { RabbitMQService } from '@/config/rabbitmq.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, PrismaService, RabbitMQService],
})
export class InventoryModule {}
