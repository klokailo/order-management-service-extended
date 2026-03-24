# Async Events

The order service publishes domain events to RabbitMQ after key operations. Downstream services (inventory, payments, notifications) consume these events independently.

## Connection

The service connects to RabbitMQ using the `RABBITMQ_URL` environment variable (default: `amqp://localhost`).

## Exchange

| Property | Value |
|----------|-------|
| Exchange name | `order_events` |
| Exchange type | `topic` |
| Durable | `true` |

All events are published to this single exchange with different routing keys.

## Routing Keys and Payloads

### `order.created`

Published when a new order is successfully saved to the database.

```json
{
  "orderId": "<order _id>",
  "customerId": "<customer id>",
  "items": [...],
  "totalAmount": 29.97
}
```

Events are published with `persistent: true`, meaning they survive a RabbitMQ broker restart.

## Important: Fire-and-Forget Publishing

Event publishing is **non-blocking and non-critical to the order creation response**. If RabbitMQ is unavailable at publish time, the event is dropped silently (a warning is logged). The order is still saved successfully.

This means:

- **Inventory reservation is not guaranteed** at the time `POST /api/orders` returns `201`.
- Downstream consumers operate on eventual consistency — there may be a delay before inventory is updated or payment is initiated.
- If the RabbitMQ channel is not established, a warning is logged: `RabbitMQ channel not established. Event dropped.`

Frontends should not assume any downstream side-effects have completed when the order creation API responds. See [order-statuses.md](./order-statuses.md) for how to track actual order progression.
