-- Crear tipo ENUM para el estado del pedido
DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear tabla orders
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "customerId" TEXT NOT NULL,
    status "OrderStatus" DEFAULT 'PENDING' NOT NULL,
    "shippingCountry" TEXT NOT NULL,
    "shippingCity" TEXT NOT NULL,
    "shippingStreet" TEXT NOT NULL,
    "shippingPostalCode" TEXT NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "correlationId" TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla order_items
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") 
        REFERENCES orders(id) ON DELETE CASCADE
);
