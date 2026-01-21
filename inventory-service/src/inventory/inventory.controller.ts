import { Controller, Get, Param, Logger, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('api/v1/products')
export class InventoryController {
  private readonly logger = new Logger(InventoryController.name);

  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllProducts() {
    this.logger.log('Received request to get all products');
    return this.inventoryService.getAllProducts();
  }

  @Get(':productId/stock')
  @HttpCode(HttpStatus.OK)
  async getProductStock(@Param('productId', ParseUUIDPipe) productId: string) {
    this.logger.log(`Received request to get stock for product: ${productId}`);
    return this.inventoryService.getProductStock(productId);
  }
}
