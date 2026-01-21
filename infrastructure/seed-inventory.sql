-- Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS products_stock (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "productId" TEXT UNIQUE NOT NULL,
    "availableStock" INTEGER NOT NULL,
    "reservedStock" INTEGER DEFAULT 0 NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos de prueba
INSERT INTO products_stock (id, "productId", "availableStock", "reservedStock") 
VALUES 
  (gen_random_uuid()::text, 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 100, 0),
  (gen_random_uuid()::text, 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 50, 0),
  (gen_random_uuid()::text, 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 25, 0)
ON CONFLICT ("productId") DO NOTHING;
