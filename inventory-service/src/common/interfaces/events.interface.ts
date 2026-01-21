export interface OrderCreatedEvent {
  eventType: 'OrderCreated';
  orderId: string;
  correlationId: string;
  createdAt: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface StockReservedEvent {
  eventType: 'StockReserved';
  orderId: string;
  correlationId: string;
  reservedItems: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface StockRejectedEvent {
  eventType: 'StockRejected';
  orderId: string;
  correlationId: string;
  reason: string;
}
