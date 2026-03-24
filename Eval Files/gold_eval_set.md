# Gold Evaluation Set — Order Management Service

20 frontend-developer questions. Each entry includes:
- The question
- The gold answer (what a correct response must contain)
- Gold file(s) — which docs must be retrieved
- Hop count — 1 = single file, 2+ = multi-file traversal required
- Leakage risk — HIGH means naive embedding or model prior knowledge might answer it without retrieval

---

## Q1
**Question:** What HTTP header do I use to send my authentication token?

**Gold answer:** `Authorization: Bearer <token>` — the `Authorization` header with the `Bearer` scheme.

**Gold files:** `docs/integration/auth.md`
**Hops:** 1
**Leakage risk:** MEDIUM — model may guess `Authorization` but the `Bearer` requirement and exact format are in the doc.

---

## Q2
**Question:** What JWT claims does the order service read from my token?

**Gold answer:** `sub` (mapped to `req.user.id`) and `role` (mapped to `req.user.role`).

**Gold files:** `docs/integration/auth.md`
**Hops:** 1
**Leakage risk:** LOW — specific field names `sub` and `role` with their mapping are only in the doc.

---

## Q3
**Question:** What fields do I need to include in the body when creating an order?

**Gold answer:** `customerId` (string), `items` array where each item has `productId` (string), `quantity` (number, min 1), and `price` (number). Do NOT send `totalAmount`.

**Gold files:** `docs/integration/orders-api.md`
**Hops:** 1
**Leakage risk:** LOW — specific field names and the "do not send totalAmount" constraint are only in the doc.

---

## Q4
**Question:** My app is getting a 403 error even though I'm sending a token. What could be wrong, and what does the response body look like?

**Gold answer:** Token was provided but verification failed (expired, tampered, or wrong secret). Response body is `{ "error": "Forbidden" }`.

**Gold files:** `docs/integration/auth.md` + `docs/integration/error-handling.md`
**Hops:** 2
**Leakage risk:** LOW — the distinction between 401 and 403 causes and the exact response body shape require both files.

---

## Q5
**Question:** Why does my Stripe webhook integration return a 400 error?

**Gold answer:** Most likely because the request body is not being sent as raw bytes. The webhook endpoint requires the raw unparsed body for Stripe's signature verification. Sending a parsed-and-re-serialized JSON body will fail even if the content is identical. Also check that the `stripe-signature` header is present.

**Gold files:** `docs/integration/webhooks.md`
**Hops:** 1
**Leakage risk:** LOW — the raw body requirement and the specific failure message are only in the doc.

---

## Q6
**Question:** What is the URL path for the Stripe webhook endpoint?

**Gold answer:** `POST /api/webhooks/stripe`

**Gold files:** `docs/integration/webhooks.md`
**Hops:** 1
**Leakage risk:** LOW — specific path is only in the doc.

---

## Q7
**Question:** What header does Stripe use to sign webhook payloads?

**Gold answer:** `stripe-signature`

**Gold files:** `docs/integration/webhooks.md`
**Hops:** 1
**Leakage risk:** MEDIUM — common Stripe knowledge, but docs confirm the service checks it.

---

## Q8
**Question:** What order statuses should my frontend be prepared to display?

**Gold answer:** Four statuses: `PENDING`, `PAID`, `SHIPPED`, `CANCELLED`.

**Gold files:** `docs/integration/order-statuses.md`
**Hops:** 1
**Leakage risk:** LOW — exact enum values are specific to this service.

---

## Q9
**Question:** After creating an order successfully, is inventory guaranteed to be reserved?

**Gold answer:** No. The `order.created` event is published asynchronously and non-blocking. If RabbitMQ is unavailable the event is dropped silently. Inventory reservation by downstream services is eventually consistent and not guaranteed at the time the API responds.

**Gold files:** `docs/integration/events.md`
**Hops:** 1
**Leakage risk:** LOW — this is a specific architectural decision about this service.

---

## Q10
**Question:** How do I fetch a paginated list of orders for a specific customer, and what auth restrictions apply?

**Gold answer:** `GET /api/orders?customerId=<id>&limit=<n>` with an `Authorization: Bearer <token>` header. If the token's `sub` doesn't match the `customerId`, the request requires `role: admin` in the token or it returns `403`.

**Gold files:** `docs/integration/pagination.md` + `docs/integration/auth.md`
**Hops:** 2
**Leakage risk:** LOW — the specific `sub`-vs-`customerId` enforcement rule requires both files.

---

## Q11
**Question:** Should I send prices in dollars or cents when creating an order?

**Gold answer:** Dollars as a float (e.g. `9.99`). The server calculates `totalAmount` internally in dollars with rounding. For Stripe `PaymentIntent` amounts, multiply by 100 to get cents.

**Gold files:** `docs/integration/error-handling.md`
**Hops:** 1
**Leakage risk:** LOW — the dollar-vs-cents split and the Stripe conversion note are specific to this service.

---

## Q12
**Question:** What does the response body look like after successfully creating an order?

**Gold answer:** JSON object with `_id`, `customerId`, `items`, `status: "PENDING"`, `totalAmount`, `createdAt`, `updatedAt`. HTTP status `201`.

**Gold files:** `docs/integration/orders-api.md`
**Hops:** 1
**Leakage risk:** LOW — specific field names and 201 status are only in the doc.

---

## Q13
**Question:** What RabbitMQ exchange should downstream services subscribe to for order events?

**Gold answer:** Exchange name `order_events`, type `topic`, durable `true`.

**Gold files:** `docs/integration/events.md`
**Hops:** 1
**Leakage risk:** LOW — exchange name is specific to this service.

---

## Q14
**Question:** What is the routing key for order creation events?

**Gold answer:** `order.created`

**Gold files:** `docs/integration/events.md`
**Hops:** 1
**Leakage risk:** LOW — specific routing key only in the doc.

---

## Q15
**Question:** The order I just created is still showing as PENDING even after the customer paid. Why might this happen?

**Gold answer:** Multiple possible causes: (1) the Stripe webhook hasn't fired yet — status transitions to `PAID` via webhook only; (2) the `PaymentIntent` was created without `metadata.orderId`, so the webhook handler can't find the order; (3) the webhook failed signature verification. Poll or listen for webhook events rather than assuming immediate status change.

**Gold files:** `docs/integration/webhooks.md` + `docs/integration/order-statuses.md`
**Hops:** 2
**Leakage risk:** LOW — the `metadata.orderId` requirement is a hidden constraint only in webhooks.md.

---

## Q16
**Question:** What happens if I don't provide an `x-correlation-id` header?

**Gold answer:** The server generates a UUID automatically and includes it in the response as `x-correlation-id`. The client-provided value is echoed back if present.

**Gold files:** `docs/integration/auth.md`
**Hops:** 1
**Leakage risk:** LOW — the auto-generation behaviour is specific to this service's middleware.

---

## Q17
**Question:** What is the maximum number of results I can request per page?

**Gold answer:** 100 (via the `limit` query parameter).

**Gold files:** `docs/integration/pagination.md`
**Hops:** 1
**Leakage risk:** LOW — specific limit only in the doc.

---

## Q18
**Question:** I need to filter orders by status. What values are valid for the status filter?

**Gold answer:** `PENDING`, `PAID`, `SHIPPED`, `CANCELLED`

**Gold files:** `docs/integration/pagination.md` (lists the filter) + `docs/integration/order-statuses.md` (defines the values)
**Hops:** 2
**Leakage risk:** MEDIUM — a system with general knowledge might guess these, but the exact valid set for this service needs retrieval.

---

## Q19
**Question:** What does the error response body look like when a webhook signature check fails?

**Gold answer:** A plain text string `Webhook Error: <message>` — NOT JSON. This is different from all other error responses which return `{ "error": "..." }`.

**Gold files:** `docs/integration/error-handling.md`
**Hops:** 1
**Leakage risk:** LOW — the plain-text-vs-JSON distinction is a non-obvious gotcha only in the doc.

---

## Q20
**Question:** Why might a PENDING order never transition to PAID even if no webhook errors occur?

**Gold answer:** If the `PaymentIntent` was created without including `orderId` in its `metadata`, the webhook handler receives the `payment_intent.succeeded` event but cannot find the corresponding order to update. The order stays `PENDING` permanently.

**Gold files:** `docs/integration/webhooks.md`
**Hops:** 1
**Leakage risk:** LOW — the `metadata.orderId` linking requirement is a hidden gotcha specific to this service's implementation.

---

## Summary

| Hops | Count | Questions |
|------|-------|-----------|
| 1 | 15 | Q1–Q3, Q5–Q9, Q11–Q14, Q16–Q17, Q19–Q20 |
| 2 | 5 | Q4, Q10, Q15, Q18 |

Multi-hop questions (Q4, Q10, Q15, Q18) are the strongest test cases — naive embedding search or model prior knowledge is very unlikely to answer these correctly since the answer requires combining facts from two different files.
