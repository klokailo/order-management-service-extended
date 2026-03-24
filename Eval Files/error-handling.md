# Error Handling

## HTTP Status Codes

| Code | Meaning | When It Occurs |
|------|---------|----------------|
| `200` | OK | Successful GET |
| `201` | Created | Successful POST (order created) |
| `400` | Bad Request | Invalid request body or failed webhook signature verification |
| `401` | Unauthorized | No `Authorization` header provided |
| `403` | Forbidden | Token provided but invalid (expired, wrong secret, tampered) — see [auth.md](./auth.md) |
| `404` | Not Found | Resource does not exist |
| `500` | Internal Server Error | Unhandled exception |

## Error Response Shape

All error responses return a JSON body:

```json
{
  "error": "Human-readable error message"
}
```

`401` returns `{ "error": "Unauthorized" }`.
`403` returns `{ "error": "Forbidden" }`.

Webhook errors (`400`) return a plain string body: `Webhook Error: <message>` — **not** JSON.

## Floating Point Pricing

Prices sent by the client (`items[].price`) are in **dollars as a float** (e.g. `9.99`). The server uses the following formula to avoid JS floating point accumulation errors:

```
totalAmount = Math.round(sum(price * quantity) * 100) / 100
```

For example, `1.09 * 3` in raw JS yields `3.2699999999999996`. The rounding step corrects this to `3.27`.

**Do not send `totalAmount` in the request body.** It is calculated and overwritten server-side regardless.

Internally, Stripe operations use cents (integers). If you are building a payments flow, multiply `totalAmount * 100` when creating a `PaymentIntent` amount.

## MongoDB and ACID

The service uses MongoDB (see [ADR 001](../architecture/001-database-choice.md)). Multi-document operations are **not** ACID-compliant by default. There is no rollback if, for example, an order is saved but the RabbitMQ publish fails. Design your frontend to handle `PENDING` orders that never transition to `PAID` — these may represent failed or incomplete flows.
