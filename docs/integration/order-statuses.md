# Order Statuses

Orders move through a defined set of statuses. The frontend should handle all four values.

## Status Values

| Status | Description | Frontend Guidance |
|--------|-------------|-------------------|
| `PENDING` | Order created, payment not yet confirmed | Show "Awaiting Payment" |
| `PAID` | Payment confirmed via Stripe webhook | Show "Order Confirmed" |
| `SHIPPED` | Order has been dispatched | Show "On Its Way" |
| `CANCELLED` | Order was cancelled | Show "Cancelled" — no further action |

## How Statuses Change

Status transitions are **not** driven by the frontend. They happen via:

- `PENDING → PAID`: Triggered automatically when Stripe fires a `payment_intent.succeeded` webhook. See [webhooks.md](./webhooks.md).
- `PAID → SHIPPED`: Updated by internal fulfilment workflows (not exposed via the public API in the current version).
- `* → CANCELLED`: Can be triggered by internal processes. No public cancel endpoint exists yet.

## Important: Eventual Consistency After Order Creation

When an order is first created (`PENDING`), the `order.created` event is published to RabbitMQ **asynchronously**. This means inventory reservation and payment initiation happen in downstream services after the API returns. See [events.md](./events.md) for details.

**The order may briefly appear as `PENDING` even if the user has already completed payment.** Poll or use webhooks to keep the frontend status up to date rather than assuming the response status is final.
