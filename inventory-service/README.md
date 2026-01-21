# Inventory Service - Microservicio de Inventario

Microservicio para la gestión de inventario en un sistema de e-commerce con arquitectura event-driven.

## 🚀 Características

- Gestión de stock de productos
- Reserva automática de stock basada en eventos
- Consumo de eventos `OrderCreated`
- Publicación de eventos `StockReserved` y `StockRejected`
- Persistencia con PostgreSQL y Prisma ORM
- API REST para consultas de stock

## 📋 Prerequisitos

- Node.js >= 20
- PostgreSQL >= 16
- RabbitMQ >= 3.12
- npm o yarn

## 🔧 Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copiar el archivo de ejemplo y configurar:

```bash
cp .env.example .env
```

Editar `.env` con tus configuraciones:

```env
# Server
PORT=3002

# Database
DATABASE_URL="postgresql://inventory_user:inventory_password@localhost:5433/inventory_db?schema=public"

# RabbitMQ
RABBITMQ_URL="amqp://guest:guest@localhost:5672"
RABBITMQ_EXCHANGE="orders.exchange"
RABBITMQ_QUEUE_ORDERS_CREATED="orders.created.queue"
RABBITMQ_ROUTING_KEY_ORDER_CREATED="order.created"
RABBITMQ_ROUTING_KEY_STOCK_RESERVED="stock.reserved"
RABBITMQ_ROUTING_KEY_STOCK_REJECTED="stock.rejected"

# Application
PORT=3002
NODE_ENV=development
```

### 3. Generar cliente de Prisma

```bash
npm run prisma:generate
```

### 4. Ejecutar migraciones

```bash
npm run prisma:migrate
```

### 5. Poblar datos de prueba (opcional)

```bash
# Conectar a la base de datos
psql -U inventory_user -d inventory_db -h localhost -p 5433

# Insertar productos de prueba
INSERT INTO products_stock (id, "productId", "availableStock", "reservedStock")
VALUES 
  (gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 100, 0),
  (gen_random_uuid(), 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 50, 0),
  (gen_random_uuid(), 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 25, 0);

# Verificar
SELECT * FROM products_stock;

# Salir
\q
```

## ▶️ Ejecución

### Modo desarrollo

```bash
npm run start:dev
```

### Modo producción

```bash
npm run build
npm run start:prod
```

El servicio estará disponible en: `http://localhost:3002`

## 📡 API Endpoints

### 1. Listar Todos los Productos

**GET** `/api/v1/products`

**Descripción:** Obtiene la lista completa de productos con su stock disponible.

**Request:**
```bash
GET http://localhost:3002/api/v1/products
```

**Response:** `200 OK`
```json
[
  {
    "productId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "availableStock": 100,
    "reservedStock": 5,
    "actuallyAvailable": 95,
    "updatedAt": "2026-01-21T19:00:00.000Z"
  },
  {
    "productId": "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e",
    "availableStock": 50,
    "reservedStock": 3,
    "actuallyAvailable": 47,
    "updatedAt": "2026-01-21T19:00:00.000Z"
  }
]
```

---

### 2. Obtener Stock de un Producto

**GET** `/api/v1/products/:productId/stock`

**Descripción:** Consulta el stock disponible de un producto específico.

**Parámetros:**
- `productId` (UUID): ID del producto

**Request:**
```bash
GET http://localhost:3002/api/v1/products/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/stock
```

**Response:** `200 OK`
```json
{
  "productId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "availableStock": 100,
  "reservedStock": 5,
  "actuallyAvailable": 95,
  "updatedAt": "2026-01-21T19:00:00.000Z"
}
```

**Response:** `404 Not Found`
```json
{
  "statusCode": 404,
  "message": "Product with ID 00000000-0000-0000-0000-000000000000 not found",
  "error": "Not Found"
}
```

---

## 🔧 Variables de Entorno

| Variable | Descripción | Ejemplo | Requerido |
|----------|-------------|---------|-----------|
| `PORT` | Puerto del servicio | `3002` | No (default: 3002) |
| `NODE_ENV` | Entorno de ejecución | `development` / `production` | No |
| `DATABASE_URL` | URL de conexión PostgreSQL | `postgresql://user:pass@host:5433/db` | Sí |
| `RABBITMQ_URL` | URL de conexión RabbitMQ | `amqp://guest:guest@localhost:5672` | Sí |
| `RABBITMQ_EXCHANGE` | Nombre del exchange | `orders.exchange` | Sí |
| `RABBITMQ_QUEUE_ORDERS_CREATED` | Cola para OrderCreated | `orders.created.queue` | Sí |
| `RABBITMQ_ROUTING_KEY_ORDER_CREATED` | Routing key OrderCreated | `order.created` | Sí |
| `RABBITMQ_ROUTING_KEY_STOCK_RESERVED` | Routing key StockReserved | `stock.reserved` | Sí |
| `RABBITMQ_ROUTING_KEY_STOCK_REJECTED` | Routing key StockRejected | `stock.rejected` | Sí |

---

## ⚡ Cómo Ejecutar

### Opción 1: Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar .env
cp .env.example .env
# Editar .env con tus configuraciones

# 3. Generar Prisma Client
npm run prisma:generate

# 4. Ejecutar migraciones
npm run prisma:migrate

# 5. Iniciar en modo desarrollo
npm run start:dev
```

### Opción 2: Con Docker (Recomendado)

```bash
# Desde la raíz del proyecto
cd infrastructure
docker compose up -d inventory-service

# Ver logs
docker logs -f ecommerce-inventory-service
```

### Opción 3: Producción

```bash
# Compilar
npm run build

# Iniciar
npm run start:prod
```

---

## 📨 Eventos

### Eventos Consumidos

#### OrderCreated

Procesa la creación de un pedido y verifica stock disponible.

```json
{
  "eventType": "OrderCreated",
  "orderId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "correlationId": "8d0e7890-8536-51ef-a55c-f18ad2f01bde",
  "items": [
    {
      "productId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "quantity": 2
    }
  ]
}
```

**Routing Key:** `order.created`

### Eventos Publicados

#### StockReserved

Publicado cuando hay stock disponible y se reserva exitosamente.

```json
{
  "eventType": "StockReserved",
  "orderId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "correlationId": "8d0e7890-8536-51ef-a55c-f18ad2f01bde",
  "reservedItems": [
    {
      "productId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "quantity": 2
    }
  ]
}
```

**Routing Key:** `stock.reserved`

#### StockRejected

Publicado cuando no hay stock suficiente o el producto no existe.

```json
{
  "eventType": "StockRejected",
  "orderId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "correlationId": "8d0e7890-8536-51ef-a55c-f18ad2f01bde",
  "reason": "Insufficient stock for product a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d. Available: 1, Requested: 2"
}
```

**Routing Key:** `stock.rejected`

## 🗄️ Base de datos

### Modelo

#### ProductStock

```prisma
model ProductStock {
  id               String   @id @default(uuid())
  productId        String   @unique
  availableStock   Int
  reservedStock    Int      @default(0)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

### Lógica de stock

- **availableStock**: Stock total disponible
- **reservedStock**: Stock reservado en pedidos pendientes
- **actuallyAvailable**: `availableStock - reservedStock`

### Comandos útiles de Prisma

```bash
# Ver base de datos en interfaz gráfica
npm run prisma:studio

# Crear nueva migración
npx prisma migrate dev --name nombre_migracion

# Aplicar migraciones en producción
npx prisma migrate deploy

# Resetear base de datos (desarrollo)
npx prisma migrate reset
```

## 🔄 Flujo de procesamiento

1. **Recibir evento OrderCreated** de RabbitMQ
2. **Verificar stock** para cada producto en el pedido:
   - ¿Existe el producto? → No: Rechazar
   - ¿Hay stock suficiente? → No: Rechazar
   - Sí: Continuar
3. **Reservar stock** (incrementar `reservedStock`)
4. **Publicar evento**:
   - Stock disponible → `StockReserved`
   - Stock insuficiente → `StockRejected`

## 🧪 Testing

### Ejemplo con cURL

```bash
# Consultar stock de un producto
curl http://localhost:3002/api/v1/products/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/stock
```

### Ejemplo completo de flujo

```bash
# 1. Insertar producto de prueba
psql -U inventory_user -d inventory_db -h localhost -p 5433 -c \
  "INSERT INTO products_stock (id, \"productId\", \"availableStock\", \"reservedStock\") \
   VALUES (gen_random_uuid(), 'test-product-001', 10, 0);"

# 2. Verificar stock
curl http://localhost:3002/api/v1/products/test-product-001/stock

# 3. Crear pedido desde order-service (esto dispara el flujo de eventos)
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "items": [{"productId": "test-product-001", "quantity": 2}],
    "shippingAddress": {
      "country": "EC",
      "city": "Quito",
      "street": "Av. Amazonas",
      "postalCode": "170135"
    },
    "paymentReference": "PAY-TEST-001"
  }'

# 4. Verificar que el stock se reservó
curl http://localhost:3002/api/v1/products/test-product-001/stock
# Debería mostrar reservedStock: 2
```

## 🏗️ Estructura del proyecto

```
inventory-service/
├── prisma/
│   └── schema.prisma                # Schema de base de datos
├── src/
│   ├── common/
│   │   └── interfaces/
│   │       └── events.interface.ts  # Interfaces de eventos
│   ├── config/
│   │   ├── prisma.service.ts        # Servicio de Prisma
│   │   └── rabbitmq.service.ts      # Servicio de RabbitMQ
│   ├── inventory/
│   │   ├── inventory.controller.ts  # Controlador REST
│   │   ├── inventory.service.ts     # Lógica de negocio
│   │   └── inventory.module.ts      # Módulo de NestJS
│   ├── app.module.ts                # Módulo principal
│   └── main.ts                      # Punto de entrada
├── .env.example                     # Ejemplo de configuración
├── .dockerignore                    # Archivos ignorados por Docker
├── Dockerfile                       # Imagen Docker
├── nest-cli.json                    # Configuración NestJS
├── package.json                     # Dependencias
├── tsconfig.json                    # Configuración TypeScript
└── README.md                        # Este archivo
```

## 🐳 Docker

### Construir imagen

```bash
docker build -t inventory-service .
```

### Ejecutar contenedor

```bash
docker run -p 3002:3002 \
  -e DATABASE_URL="postgresql://inventory_user:inventory_password@host.docker.internal:5433/inventory_db" \
  -e RABBITMQ_URL="amqp://guest:guest@host.docker.internal:5672" \
  inventory-service
```

## 📊 Logs

El servicio registra:

- Conexión a base de datos
- Conexión a RabbitMQ
- Eventos OrderCreated recibidos
- Verificaciones de stock
- Reservas de stock
- Publicación de eventos StockReserved/StockRejected
- Errores y excepciones

## 🛠️ Troubleshooting

### Error de conexión a base de datos

Verificar que PostgreSQL esté corriendo y las credenciales sean correctas.

```bash
psql -U inventory_user -d inventory_db -h localhost -p 5433
```

### Error de conexión a RabbitMQ

Verificar que RabbitMQ esté corriendo:

```bash
curl http://localhost:15672
```

### Eventos no se procesan

1. Verificar que la cola `orders.created.queue` exista en RabbitMQ
2. Verificar bindings: `order.created` → `orders.created.queue`
3. Ver logs del servicio para errores

### Stock no se reserva

Verificar en logs:

```bash
# Logs del servicio
npm run start:dev

# O con Docker
docker logs ecommerce-inventory-service -f
```

## 🔒 Validación de stock

El servicio verifica:

1. **Existencia del producto**: Si el `productId` existe en la base de datos
2. **Stock disponible**: Si `(availableStock - reservedStock) >= quantity`
3. **Transacciones atómicas**: Todas las reservas se hacen en una transacción

## 🔄 Manejo de errores

- **Producto no encontrado** → Publica `StockRejected`
- **Stock insuficiente** → Publica `StockRejected`
- **Error interno** → Publica `StockRejected` con mensaje de error
- **Error de procesamiento** → NACK del mensaje (reintento)

## 👨‍💻 Desarrollo

### Formato de código

```bash
npm run format
```

### Linting

```bash
npm run lint
```

## 📈 Mejoras futuras

- [ ] Endpoint para actualizar stock
- [ ] Endpoint para crear productos
- [ ] Liberar stock cuando un pedido se cancela
- [ ] TTL para reservas de stock
- [ ] Métricas de stock bajo
- [ ] Historial de movimientos de stock

## 📝 Notas importantes

- El stock se reserva pero no se decrementa hasta que el pedido se confirma
- Todas las operaciones de stock usan transacciones para garantizar consistencia
- ACK manual en RabbitMQ asegura que los mensajes no se pierdan
- Reconexión automática a RabbitMQ en caso de desconexión

## 📄 Licencia

MIT
