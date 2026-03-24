# Orders API

Base path: `/api/orders` (requires authentication — see [auth.md](./auth.md))

## Create Order

**`POST /api/orders`**

Creates a new order in `PENDING` status and publishes an `order.created` event to RabbitMQ asynchronously.

### Request Body

```json
{
  "customerId": "string",
  "items": [
    {
      "productId": "string",
      "quantity": 1,
      "price": 9.99
    }
  ]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `customerId` | string | yes | ID of the customer placing the order |
| `items` | array | yes | Must contain at least one item |
| `items[].productId` | string | yes | |
| `items[].quantity` | number | yes | Minimum value: `1` |
| `items[].price` | number | yes | Unit price in dollars. See [error-handling.md](./error-handling.md) for floating point notes. |

`totalAmount` is **calculated server-side** — do not send it. The server sums `price * quantity` for each item and rounds to 2 decimal places to avoid floating point errors.

### Response

**`201 Created`**

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "customerId": "cust_123",
  "items": [...],
  "status": "PENDING",
  "totalAmount": 29.97,
  "createdAt": "2026-02-20T10:00:00.000Z",
  "updatedAt": "2026-02-20T10:00:00.000Z"
}
```

Note: `createdAt` and `updatedAt` are added automatically by Mongoose timestamps.

## Get Order by ID

**`GET /api/orders/:id`**

Returns a single order. Returns `null` body with `404` if not found.

## Order Statuses

See [order-statuses.md](./order-statuses.md) for the full list of statuses and valid transitions.

## Pagination

See [pagination.md](./pagination.md) for query parameters supported on list endpoints.
