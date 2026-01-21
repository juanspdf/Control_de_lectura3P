# Documentación de Arquitectura - Sistema de Microservicios E-commerce

## 📐 Arquitectura del Sistema

### Visión General

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE (HTTP)                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
┌──────────────────────┐    ┌──────────────────────┐
│   Order Service      │    │  Inventory Service   │
│   (NestJS)           │    │  (NestJS)            │
│   Port: 3001         │    │  Port: 3002          │
└──────────┬───────────┘    └──────────┬───────────┘
           │                           │
           │         RabbitMQ          │
           │   ┌──────────────────┐   │
           └──▶│  Message Broker  │◀──┘
               │  (Topic Exchange)│
               └──────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│  PostgreSQL      │          │  PostgreSQL      │
│  Order DB        │          │  Inventory DB    │
│  Port: 5432      │          │  Port: 5433      │
└──────────────────┘          └──────────────────┘
```

## 🔄 Flujo de Eventos (Event-Driven)

### Caso 1: Pedido Exitoso (Stock Disponible)

```
Cliente                Order Service              RabbitMQ              Inventory Service
  │                          │                        │                        │
  │──POST /orders───────────▶│                        │                        │
  │                          │                        │                        │
  │                          │─1. Guardar Pedido─────▶│                        │
  │                          │   (Estado: PENDING)    │                        │
  │                          │                        │                        │
  │◀─201 Created─────────────│                        │                        │
  │  (orderId, PENDING)      │                        │                        │
  │                          │                        │                        │
  │                          │─2. OrderCreated────────▶│                        │
  │                          │   (eventType, orderId) │                        │
  │                          │                        │                        │
  │                          │                        │─3. Consume Event──────▶│
  │                          │                        │                        │
  │                          │                        │                  4. Check Stock
  │                          │                        │                  5. Reserve Stock
  │                          │                        │                        │
  │                          │                        │◀6. StockReserved───────│
  │                          │                        │   (orderId, items)     │
  │                          │                        │                        │
  │                          │◀7. Consume Event───────│                        │
  │                          │                        │                        │
  │                    8. Update Order                │                        │
  │                    (Estado: CONFIRMED)            │                        │
  │                          │                        │                        │
  │──GET /orders/:id────────▶│                        │                        │
  │                          │                        │                        │
  │◀─200 OK──────────────────│                        │                        │
  │  (orderId, CONFIRMED)    │                        │                        │
```

### Caso 2: Pedido Rechazado (Stock Insuficiente)

```
Cliente                Order Service              RabbitMQ              Inventory Service
  │                          │                        │                        │
  │──POST /orders───────────▶│                        │                        │
  │                          │                        │                        │
  │                          │─1. Guardar Pedido─────▶│                        │
  │                          │   (Estado: PENDING)    │                        │
  │                          │                        │                        │
  │◀─201 Created─────────────│                        │                        │
  │  (orderId, PENDING)      │                        │                        │
  │                          │                        │                        │
  │                          │─2. OrderCreated────────▶│                        │
  │                          │                        │                        │
  │                          │                        │─3. Consume Event──────▶│
  │                          │                        │                        │
  │                          │                        │                  4. Check Stock
  │                          │                        │                  (Stock Insuficiente)
  │                          │                        │                        │
  │                          │                        │◀5. StockRejected───────│
  │                          │                        │   (orderId, reason)    │
  │                          │                        │                        │
  │                          │◀6. Consume Event───────│                        │
  │                          │                        │                        │
  │                    7. Update Order                │                        │
  │                    (Estado: CANCELLED)            │                        │
  │                          │                        │                        │
  │──GET /orders/:id────────▶│                        │                        │
  │                          │                        │                        │
  │◀─200 OK──────────────────│                        │                        │
  │  (orderId, CANCELLED)    │                        │                        │
```

## 📊 Modelo de Datos

### Order Service - Base de Datos

```sql
-- Tabla: orders
┌──────────────────┬──────────────┬─────────────┐
│ Columna          │ Tipo         │ Descripción │
├──────────────────┼──────────────┼─────────────┤
│ id               │ UUID (PK)    │ ID único    │
│ customerId       │ UUID         │ Cliente     │
│ status           │ ENUM         │ PENDING/CONFIRMED/CANCELLED │
│ shippingCountry  │ VARCHAR      │ País        │
│ shippingCity     │ VARCHAR      │ Ciudad      │
│ shippingStreet   │ VARCHAR      │ Calle       │
│ shippingPostalCode│ VARCHAR     │ Código postal│
│ paymentReference │ VARCHAR      │ Referencia  │
│ correlationId    │ UUID (UNIQUE)│ Correlación │
│ createdAt        │ TIMESTAMP    │ Fecha creación│
│ updatedAt        │ TIMESTAMP    │ Fecha actualización│
└──────────────────┴──────────────┴─────────────┘

-- Tabla: order_items
┌──────────────────┬──────────────┬─────────────┐
│ Columna          │ Tipo         │ Descripción │
├──────────────────┼──────────────┼─────────────┤
│ id               │ UUID (PK)    │ ID único    │
│ orderId          │ UUID (FK)    │ Pedido      │
│ productId        │ UUID         │ Producto    │
│ quantity         │ INTEGER      │ Cantidad    │
│ createdAt        │ TIMESTAMP    │ Fecha       │
└──────────────────┴──────────────┴─────────────┘

Relación: Order 1 ──< N OrderItem (CASCADE DELETE)
```

### Inventory Service - Base de Datos

```sql
-- Tabla: products_stock
┌──────────────────┬──────────────┬─────────────┐
│ Columna          │ Tipo         │ Descripción │
├──────────────────┼──────────────┼─────────────┤
│ id               │ UUID (PK)    │ ID único    │
│ productId        │ UUID (UNIQUE)│ ID producto │
│ availableStock   │ INTEGER      │ Stock total │
│ reservedStock    │ INTEGER      │ Stock reservado│
│ createdAt        │ TIMESTAMP    │ Fecha creación│
│ updatedAt        │ TIMESTAMP    │ Fecha actualización│
└──────────────────┴──────────────┴─────────────┘

Lógica:
  actuallyAvailable = availableStock - reservedStock
```

## 📨 Formato de Eventos

### 1. OrderCreated

**Routing Key:** `order.created`  
**Publicado por:** Order Service  
**Consumido por:** Inventory Service

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

### 2. StockReserved

**Routing Key:** `stock.reserved`  
**Publicado por:** Inventory Service  
**Consumido por:** Order Service

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

### 3. StockRejected

**Routing Key:** `stock.rejected`  
**Publicado por:** Inventory Service  
**Consumido por:** Order Service

```json
{
  "eventType": "StockRejected",
  "orderId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "correlationId": "8d0e7890-8536-51ef-a55c-f18ad2f01bde",
  "reason": "Insufficient stock for product a1b2c3d4... Available: 1, Requested: 2"
}
```

## 🛡️ RabbitMQ - Configuración

### Exchange

```
Nombre: orders.exchange
Tipo: topic
Durable: true
Auto-delete: false
```

### Colas

```
1. orders.created.queue
   - Durable: true
   - Binding: order.created → orders.exchange
   - Consumer: Inventory Service

2. orders.response.queue
   - Durable: true
   - Bindings:
     * stock.reserved → orders.exchange
     * stock.rejected → orders.exchange
   - Consumer: Order Service
```

### Propiedades de Mensajes

```yaml
Persistent: true
Content-Type: application/json
Manual ACK: true
Retry: automático (por reconexión)
```

## 🔒 Patrones de Diseño Implementados

### 1. Event-Driven Architecture (EDA)
- Comunicación asíncrona entre servicios
- Desacoplamiento mediante eventos
- Escalabilidad independiente

### 2. Saga Pattern (Choreography)
- Transacciones distribuidas
- Compensación mediante eventos (StockRejected)
- Sin coordinador central

### 3. Database per Service
- Cada microservicio tiene su propia base de datos
- Autonomía e independencia
- Sin acoplamiento de datos

### 4. API Gateway Pattern (Implícito)
- Cada servicio expone su propia API REST
- Endpoints versionados (/api/v1/...)

### 5. Correlation ID Pattern
- Trazabilidad de eventos relacionados
- Debugging distribuido
- UUID único por transacción

## 🎯 Ventajas de la Arquitectura

### Escalabilidad
- Servicios independientes pueden escalar horizontalmente
- RabbitMQ maneja múltiples consumidores

### Resiliencia
- Fallo de un servicio no afecta a otros
- ACK manual asegura procesamiento
- Reconexión automática

### Mantenibilidad
- Código modular y desacoplado
- Responsabilidades claras
- Testing independiente

### Performance
- Procesamiento asíncrono
- No bloquea al cliente
- Mejor uso de recursos

## 🔄 Flujo de Despliegue

```
┌─────────────────┐
│  Código Fuente  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Docker Build   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Docker Compose  │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌────────┐ ┌────┐ ┌──────────┐ ┌──────────┐
│RabbitMQ│ │ DB │ │  Order   │ │Inventory │
└────────┘ └────┘ └──────────┘ └──────────┘
```

## 📈 Métricas y Monitoreo

### Puntos de observabilidad

1. **Logs Estructurados**
   - Cada evento registrado
   - Timestamps y contexto
   - Error tracking

2. **RabbitMQ Management UI**
   - Mensajes en cola
   - Tasa de procesamiento
   - Errores de consumo

3. **Health Checks**
   - PostgreSQL: `pg_isready`
   - RabbitMQ: `rabbitmq-diagnostics`

## 🚀 Casos de Uso

### 1. Compra normal
- Cliente crea pedido
- Stock disponible
- Pedido confirmado

### 2. Stock insuficiente
- Cliente crea pedido
- Stock no disponible
- Pedido cancelado automáticamente

### 3. Producto no existe
- Cliente crea pedido con producto inválido
- Inventory Service detecta producto inexistente
- Pedido cancelado con razón específica

## 🎓 Conceptos Académicos Aplicados

### Sistemas Distribuidos
- CAP Theorem: Priorizamos Availability y Partition tolerance
- Eventual Consistency: Estados finalmente consistentes
- Message Queuing: Comunicación asíncrona

### Arquitectura de Software
- Separation of Concerns
- Single Responsibility Principle
- Dependency Inversion

### Bases de Datos
- Transacciones ACID a nivel de servicio
- BASE (Basically Available, Soft state, Eventual consistency)

## 📚 Tecnologías - Justificación

| Tecnología | Razón de Uso |
|------------|--------------|
| NestJS | Framework enterprise, TypeScript, modular |
| Prisma | ORM type-safe, migraciones automáticas |
| PostgreSQL | ACID, confiabilidad, relaciones |
| RabbitMQ | Message broker maduro, routing flexible |
| Docker | Portabilidad, consistencia de entornos |

## 🎯 Conclusiones

1. **Arquitectura event-driven** permite desacoplamiento real entre servicios
2. **RabbitMQ** proporciona confiabilidad en mensajería
3. **Prisma** simplifica gestión de bases de datos
4. **Docker** facilita despliegue y desarrollo
5. Sistema **escalable, mantenible y resiliente**

---

**Fecha de entrega:** Enero 2026  
**Curso:** Arquitectura de Microservicios  
**Institución:** Universidad
