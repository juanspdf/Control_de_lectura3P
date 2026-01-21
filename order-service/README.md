# Order Service - Microservicio de Pedidos

Microservicio para la gestión de pedidos en un sistema de e-commerce con arquitectura event-driven.

## 🚀 Características

- Creación de pedidos con validación de datos
- Gestión de estados de pedidos (PENDING, CONFIRMED, CANCELLED)
- Publicación de eventos `OrderCreated` a RabbitMQ
- Consumo de eventos `StockReserved` y `StockRejected`
- Persistencia con PostgreSQL y Prisma ORM
- API REST con validación de DTOs

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
PORT=3001

# Database
DATABASE_URL="postgresql://order_user:order_password@localhost:5432/order_db?schema=public"

# RabbitMQ
RABBITMQ_URL="amqp://guest:guest@localhost:5672"
RABBITMQ_EXCHANGE="orders.exchange"
RABBITMQ_QUEUE_ORDERS_CREATED="orders.created.queue"
RABBITMQ_QUEUE_ORDERS_RESPONSE="orders.response.queue"
RABBITMQ_ROUTING_KEY_ORDER_CREATED="order.created"
RABBITMQ_ROUTING_KEY_STOCK_RESERVED="stock.reserved"
RABBITMQ_ROUTING_KEY_STOCK_REJECTED="stock.rejected"

# Application
PORT=3001
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

El servicio estará disponible en: `http://localhost:3001`

## 📡 API Endpoints

### 1. Crear un Pedido

**POST** `/api/v1/orders`

**Descripción:** Crea un nuevo pedido. El pedido se crea en estado `PENDING` y se procesa asíncronamente mediante eventos de RabbitMQ.

**Request Body:**
```json
{
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "productId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "quantity": 5
    }
  ],
  "shippingAddress": {
    "country": "EC",
    "city": "Quito",
    "street": "Av. Amazonas N24-03",
    "postalCode": "170135"
  },
  "paymentReference": "PAY-2024-001"
}
```

**Validaciones:**
- `customerId`: UUID válido (requerido)
- `items`: Array no vacío (requerido)
  - `productId`: UUID válido (requerido)
  - `quantity`: Número entero positivo (requerido)
- `shippingAddress`: Objeto completo (requerido)
  - `country`, `city`, `street`, `postalCode`: Strings no vacíos
- `paymentReference`: String no vacío (requerido)

**Response:** `201 Created`
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "shippingCountry": "EC",
  "shippingCity": "Quito",
  "shippingStreet": "Av. Amazonas N24-03",
  "shippingPostalCode": "170135",
  "paymentReference": "PAY-2024-001",
  "correlationId": "8d0e7890-8536-51ef-a55c-f18ad2f01bde",
  "createdAt": "2026-01-21T10:30:00.000Z",
  "updatedAt": "2026-01-21T10:30:00.000Z",
  "items": [
    {
      "id": "9f1e8901-9647-62fg-b66d-g29be3g12cef",
      "productId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "quantity": 5,
      "orderId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "createdAt": "2026-01-21T10:30:00.000Z"
    }
  ]
}
}
```

**Response:** `400 Bad Request`
```json
{
  "statusCode": 400,
  "message": [
    "customerId must be a UUID",
    "items should not be empty"
  ],
  "error": "Bad Request"
}
```

---

### 2. Obtener un Pedido por ID

**GET** `/api/v1/orders/:orderId`

**Descripción:** Consulta el estado actual de un pedido por su ID.

**Parámetros:**
- `orderId` (UUID): ID del pedido

**Request:**
```bash
GET http://localhost:3001/api/v1/orders/7c9e6679-7425-40de-944b-e07fc1f90ae7
```

**Response:** `200 OK`
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "CONFIRMED",
  "shippingCountry": "EC",
  "shippingCity": "Quito",
  "shippingStreet": "Av. Amazonas N24-03",
  "shippingPostalCode": "170135",
  "paymentReference": "PAY-2024-001",
  "correlationId": "8d0e7890-8536-51ef-a55c-f18ad2f01bde",
  "createdAt": "2026-01-21T10:30:00.000Z",
  "updatedAt": "2026-01-21T10:30:15.000Z",
  "items": [
    {
      "id": "9f1e8901-9647-62fg-b66d-g29be3g12cef",
      "productId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "quantity": 5,
      "orderId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "createdAt": "2026-01-21T10:30:00.000Z"
    }
  ]
}
```

**Estados posibles:**
- `PENDING`: Pedido creado, esperando validación de stock
- `CONFIRMED`: Stock reservado exitosamente
- `CANCELLED`: Stock insuficiente o producto no disponible

**Response:** `404 Not Found`
```json
{
  "statusCode": 404,
  "message": "Order with ID 00000000-0000-0000-0000-000000000000 not found",
  "error": "Not Found"
}
```

---

## 🔧 Variables de Entorno

| Variable | Descripción | Ejemplo | Requerido |
|----------|-------------|---------|-----------|
| `PORT` | Puerto del servicio | `3001` | No (default: 3001) |
| `NODE_ENV` | Entorno de ejecución | `development` / `production` | No |
| `DATABASE_URL` | URL de conexión PostgreSQL | `postgresql://user:pass@host:5432/db` | Sí |
| `RABBITMQ_URL` | URL de conexión RabbitMQ | `amqp://guest:guest@localhost:5672` | Sí |
| `RABBITMQ_EXCHANGE` | Nombre del exchange | `orders.exchange` | Sí |
| `RABBITMQ_QUEUE_ORDERS_CREATED` | Cola para publicar OrderCreated | `orders.created.queue` | Sí |
| `RABBITMQ_QUEUE_ORDERS_RESPONSE` | Cola para respuestas de Inventory | `orders.response.queue` | Sí |
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
docker compose up -d order-service

# Ver logs
docker logs -f ecommerce-order-service
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

### Eventos Publicados

#### OrderCreated

Publicado cuando se crea un nuevo pedido.

```json
{
  "eventType": "OrderCreated",
  "orderId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "correlationId": "8d0e7890-8536-51ef-a55c-f18ad2f01bde",
  "createdAt": "2026-01-21T10:30:00.000Z",
  "items": [
    {
      "productId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "quantity": 2
    }
  ]
}
```

**Routing Key:** `order.created`

### Eventos Consumidos

#### StockReserved

Actualiza el pedido a estado `CONFIRMED`.

```json
{
  "eventType": "StockReserved",
  "orderId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "correlationId": "8d0e7890-8536-51ef-a55c-f18ad2f01bde",
  "reservedItems": [...]
}
```

**Routing Key:** `stock.reserved`

#### StockRejected

Actualiza el pedido a estado `CANCELLED`.

```json
{
  "eventType": "StockRejected",
  "orderId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "correlationId": "8d0e7890-8536-51ef-a55c-f18ad2f01bde",
  "reason": "Insufficient stock for product..."
}
```

**Routing Key:** `stock.rejected`

## 🗄️ Base de datos

### Modelos

#### Order

```prisma
model Order {
  id                 String      @id @default(uuid())
  customerId         String
  status             OrderStatus @default(PENDING)
  shippingCountry    String
  shippingCity       String
  shippingStreet     String
  shippingPostalCode String
  paymentReference   String
  correlationId      String      @unique @default(uuid())
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt
  items              OrderItem[]
}

enum OrderStatus {
  PENDING
  CONFIRMED
  CANCELLED
}
```

#### OrderItem

```prisma
model OrderItem {
  id        String   @id @default(uuid())
  orderId   String
  productId String
  quantity  Int
  createdAt DateTime @default(now())
  order     Order    @relation(fields: [orderId], references: [id])
}
```

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

## 🧪 Testing

### Ejemplo con cURL

```bash
# Crear un pedido
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "items": [
      {
        "productId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
        "quantity": 2
      }
    ],
    "shippingAddress": {
      "country": "EC",
      "city": "Quito",
      "street": "Av. Amazonas N24-03",
      "postalCode": "170135"
    },
    "paymentReference": "PAY-2024-001"
  }'

# Obtener un pedido
curl http://localhost:3001/api/v1/orders/7c9e6679-7425-40de-944b-e07fc1f90ae7
```

## 🏗️ Estructura del proyecto

```
order-service/
├── prisma/
│   └── schema.prisma           # Schema de base de datos
├── src/
│   ├── common/
│   │   └── interfaces/
│   │       └── events.interface.ts  # Interfaces de eventos
│   ├── config/
│   │   ├── prisma.service.ts        # Servicio de Prisma
│   │   └── rabbitmq.service.ts      # Servicio de RabbitMQ
│   ├── orders/
│   │   ├── dto/
│   │   │   └── create-order.dto.ts  # DTOs de validación
│   │   ├── orders.controller.ts     # Controlador REST
│   │   ├── orders.service.ts        # Lógica de negocio
│   │   └── orders.module.ts         # Módulo de NestJS
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
docker build -t order-service .
```

### Ejecutar contenedor

```bash
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://order_user:order_password@host.docker.internal:5432/order_db" \
  -e RABBITMQ_URL="amqp://guest:guest@host.docker.internal:5672" \
  order-service
```

## 🔒 Validaciones

El servicio implementa validaciones estrictas:

- **customerId**: Debe ser un UUID válido
- **productId**: Debe ser un UUID válido
- **quantity**: Debe ser un número
- **shippingAddress**: Todos los campos son requeridos
- **paymentReference**: Campo requerido

## 📊 Logs

El servicio registra:

- Creación de pedidos
- Publicación de eventos
- Consumo de eventos
- Actualizaciones de estado
- Errores y excepciones

## 🛠️ Troubleshooting

### Error de conexión a base de datos

Verificar que PostgreSQL esté corriendo y las credenciales sean correctas.

```bash
psql -U order_user -d order_db -h localhost
```

### Error de conexión a RabbitMQ

Verificar que RabbitMQ esté corriendo:

```bash
curl http://localhost:15672
```

### Mensajes no se procesan

Verificar que las colas y bindings estén configurados correctamente en RabbitMQ Management UI.

## 👨‍💻 Desarrollo

### Formato de código

```bash
npm run format
```

### Linting

```bash
npm run lint
```

## 📝 Notas importantes

- Todos los IDs son UUIDs v4
- Los eventos tienen ACK manual para mayor confiabilidad
- El servicio implementa reconexión automática a RabbitMQ
- Health checks aseguran que las dependencias estén listas

## 📄 Licencia

MIT
