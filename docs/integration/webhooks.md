# Webhooks

## Stripe Webhook

**Endpoint:** `POST /api/webhooks/stripe`

This endpoint is handled by Stripe and should **not** be called directly by your frontend.

### ⚠️ Critical: Raw Body Requirement

The Stripe webhook endpoint **must receive the raw, unparsed request body** for signature verification to succeed. This is a hard requirement from Stripe's SDK.

The route is registered in the application **before** `express.json()` middleware, which means `express.json()` does NOT process this route. If you are writing integration tests or a proxy that forwards webhook events, you must send the raw bytes — not a parsed JSON object re-serialized.

Sending a parsed-and-re-stringified body (even if the JSON content is identical) will cause signature verification to fail with a `400` error:

```
Webhook Error: No signatures found matching the expected signature for payload
```

### Required Header

```
stripe-signature: <value provided by Stripe>
```

This header is set by Stripe automatically when it sends webhook events. The value is a timestamp + HMAC signature. It is verified against the `STRIPE_WEBHOOK_SECRET` environment variable.

### Handled Event Types

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Order status updated to `PAID` using `orderId` from `paymentIntent.metadata` |
| `payment_intent.payment_failed` | Logged as a warning; no order state change currently |

All other event types are logged and ignored.

### Linking Payments to Orders

When creating a Stripe `PaymentIntent` on the client side, you **must** include the order ID in the metadata:

```json
{
  "metadata": {
    "orderId": "<the _id from POST /api/orders response>"
  }
}
```

Without this, the webhook handler cannot find the order to update and the status will remain `PENDING` indefinitely.
