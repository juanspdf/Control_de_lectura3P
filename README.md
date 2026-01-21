# Sistema de Microservicios - E-Commerce

Sistema distribuido de microservicios para gestión de pedidos e inventario con arquitectura event-driven usando RabbitMQ.

## 📋 Descripción

Sistema de e-commerce basado en microservicios que implementa un flujo asíncrono de procesamiento de pedidos con validación de inventario en tiempo real mediante eventos de RabbitMQ.

### Flujo del Sistema

1. **Cliente crea un pedido** → Estado inicial: `PENDING`
2. **Order Service publica** evento `OrderCreated` a RabbitMQ
3. **Inventory Service consume** el evento y valida stock
4. **Inventory Service publica**:
   - `StockReserved` si hay stock suficiente
   - `StockRejected` si no hay stock
5. **Order Service consume** la respuesta y actualiza:
   - Estado `CONFIRMED` si stock reservado
   - Estado `CANCELLED` si stock rechazado



## 🚀 Tecnologías

- **Node.js 20** - Runtime de JavaScript
- **NestJS** - Framework backend
- **TypeScript** - Lenguaje tipado
- **PostgreSQL 16** - Base de datos relacional
- **Prisma ORM** - Object-Relational Mapping (migraciones automáticas)
- **RabbitMQ 3.12** - Message broker
- **Docker & Docker Compose** - Contenedores

> **⚠️ Nota Importante**: Las migraciones de Prisma se ejecutan automáticamente al iniciar los contenedores, pero **las tablas y datos iniciales deben cargarse manualmente** usando los scripts SQL proporcionados.

## 📦 Estructura del Proyecto

```
Control_de_lectura3P/
├── infrastructure/          # Configuración de infraestructura
│   ├── docker-compose.yml   # Orquestación de servicios
│   ├── seed-inventory.sql   # Datos iniciales de inventario
│   └── seed-orders.sql      # Tablas de órdenes
├── order-service/           # Microservicio de pedidos
│   ├── src/
│   ├── prisma/
│   ├── Dockerfile
│   └── README.md
├── inventory-service/       # Microservicio de inventario
│   ├── src/
│   ├── prisma/
│   ├── Dockerfile
│   └── README.md
└── test-requests.http       # Colección de pruebas HTTP
```

## ⚙️ Servicios

### Order Service (Puerto 3001)
- Gestión de pedidos
- Estados: PENDING → CONFIRMED/CANCELLED
- Publica: `OrderCreated`
- Consume: `StockReserved`, `StockRejected`

### Inventory Service (Puerto 3002)
- Gestión de stock de productos
- Reserva automática de inventario
- Consume: `OrderCreated`
- Publica: `StockReserved`, `StockRejected`

### RabbitMQ (Puerto 5672, Management 15672)
- Exchange: `orders.exchange` (tipo: topic)
- Colas:
  - `orders.created.queue`
  - `orders.response.queue`

### PostgreSQL
- `order_db` (Puerto 5432) - Base de datos de pedidos
- `inventory_db` (Puerto 5433) - Base de datos de inventario

## 🚀 Inicio Rápido

### Prerequisitos

- Docker Desktop instalado
- Docker Compose v2.0+
- Node.js 20+ (opcional, para desarrollo local)

### Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd Control_de_lectura3P
```

2. **Iniciar todos los servicios con Docker**
```bash
cd infrastructure
docker compose up -d
```

3. **Verificar que los servicios estén corriendo**
```bash
docker compose ps
```

Deberías ver todos los servicios con estado "running" o "healthy".

4. **⚠️ IMPORTANTE: Cargar datos iniciales (OBLIGATORIO)**

Los contenedores ejecutan las migraciones de Prisma automáticamente, pero **debes crear las tablas y cargar los datos iniciales** manualmente:

```powershell
# Cargar datos de inventario (crea tabla y productos)
Get-Content seed-inventory.sql | docker exec -i ecommerce-postgres-inventory psql -U inventory_user -d inventory_db

# Cargar estructura de tablas de órdenes
Get-Content seed-orders.sql | docker exec -i ecommerce-postgres-order psql -U order_user -d order_db
```

**¿Por qué es necesario?**
- `seed-inventory.sql`: Crea la tabla `products_stock` e inserta 3 productos de prueba con sus stocks iniciales
- `seed-orders.sql`: Crea las tablas `orders` y `order_items` con sus enums y relaciones

Sin estos scripts, los endpoints fallarán con error "tabla no existe".

5. **Verificar que todo funciona**
```bash
# Listar productos (debe retornar 3 productos)
curl http://localhost:3002/api/v1/products

# Deberías ver:
# - Producto 1: 100 unidades
# - Producto 2: 50 unidades  
# - Producto 3: 25 unidades
```

### Detener los servicios

```bash
cd infrastructure
docker compose down
```

## 📡 API Endpoints

### Order Service (http://localhost:3001)

#### Crear Pedido
```http
POST /api/v1/orders
Content-Type: application/json

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
  "paymentReference": "PAY-TEST-001"
}
```

#### Consultar Pedido
```http
GET /api/v1/orders/{orderId}
```

### Inventory Service (http://localhost:3002)

#### Listar Productos
```http
GET /api/v1/products
```

#### Consultar Stock
```http
GET /api/v1/products/{productId}/stock
```

## 🧪 Pruebas

### Productos de Prueba

```
Producto 1: a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d (100 unidades)
Producto 2: b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e (50 unidades)
Producto 3: c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f (25 unidades)
```

### Escenarios de Prueba

#### ✅ Escenario 1: Pedido Exitoso
1. Verificar stock inicial: `GET /api/v1/products/{productId}/stock`
2. Crear pedido con cantidad disponible: `POST /api/v1/orders`
3. Esperar 2-3 segundos
4. Consultar pedido: `GET /api/v1/orders/{orderId}`
5. Verificar estado: `CONFIRMED`
6. Verificar stock actualizado: Stock reservado debe incrementar

#### ❌ Escenario 2: Stock Insuficiente
1. Crear pedido con cantidad mayor al stock disponible
2. Esperar 2-3 segundos
3. Consultar pedido
4. Verificar estado: `CANCELLED`
5. Verificar stock sin cambios

### Usando el archivo test-requests.http

Si usas VS Code con la extensión REST Client:

```bash
# Abrir test-requests.http
# Click en "Send Request" sobre cada endpoint
```

## 🔍 Monitoreo

### Ver logs de los servicios

```bash
# Order Service
docker logs -f ecommerce-order-service

# Inventory Service
docker logs -f ecommerce-inventory-service

# RabbitMQ
docker logs -f ecommerce-rabbitmq
```

### RabbitMQ Management UI

Acceder a: http://localhost:15672
- Usuario: `guest`
- Password: `guest`

## 🛠️ Desarrollo Local

### Order Service

```bash
cd order-service
npm install
npm run start:dev
```

Ver [order-service/README.md](order-service/README.md) para más detalles.

### Inventory Service

```bash
cd inventory-service
npm install
npm run start:dev
```

Ver [inventory-service/README.md](inventory-service/README.md) para más detalles.

## 🐛 Troubleshooting

### Los contenedores no inician

```bash
# Verificar logs
docker compose logs

# Reiniciar servicios
docker compose restart
```

### Error de conexión a base de datos

```bash
# Verificar que PostgreSQL esté corriendo
docker compose ps

# Verificar salud de contenedores
docker compose ps
```

### RabbitMQ no procesa eventos

```bash
# Verificar que RabbitMQ esté healthy
docker inspect ecommerce-rabbitmq

# Ver logs de RabbitMQ
docker logs ecommerce-rabbitmq
```

### Resetear todo el sistema

```bash
cd infrastructure
docker compose down -v  # Borra volúmenes
docker compose up -d
# Volver a cargar datos con seed-*.sql
```

## 📊 Variables de Entorno

### Order Service

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| PORT | Puerto del servicio | 3001 |
| DATABASE_URL | URL de PostgreSQL | postgresql://order_user:order_password@postgres-order:5432/order_db |
| RABBITMQ_URL | URL de RabbitMQ | amqp://guest:guest@rabbitmq:5672 |

### Inventory Service

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| PORT | Puerto del servicio | 3002 |
| DATABASE_URL | URL de PostgreSQL | postgresql://inventory_user:inventory_password@postgres-inventory:5432/inventory_db |
| RABBITMQ_URL | URL de RabbitMQ | amqp://guest:guest@rabbitmq:5672 |

## 📚 Documentación Adicional

- [Order Service README](order-service/README.md)
- [Inventory Service README](inventory-service/README.md)
- [Guía de Validación de Laboratorio](GUIA_VALIDACION_LABORATORIO.md)
- [Arquitectura del Sistema](ARQUITECTURA.md)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es parte de un trabajo académico.

## 👥 Autores

- Control de Lectura 3P - Sistemas Distribuidos

---

**Nota**: Este sistema implementa el patrón Saga con coreografía usando eventos asíncronos para garantizar la consistencia eventual entre microservicios.
