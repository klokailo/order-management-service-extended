# ADR 003: Idempotency Strategy for Order Creation

**Date:** 2023-10-27
**Status:** Accepted

## Context
Order creation via our public API and Stripe webhooks is prone to network retries. If a client experiences a timeout and retries, we risk charging the customer twice and creating duplicate orders. We need an idempotency mechanism.

## Decision
We will require an `Idempotency-Key` header on POST `/orders`. We considered using Redis for this because of its speed and native TTL capabilities. However, we have opted to use **MongoDB** (via a dedicated `IdempotencyKey` collection). 

## Rationale
1. **Transactionality:** In the future, we want to wrap the idempotency key check and the order creation in a single MongoDB replica set transaction. Using Redis would require distributed transactions (two-phase commit) which drastically increases system complexity.
2. **Infrastructure limits:** We want to keep the operational overhead low. We already maintain MongoDB for persistent storage.
3. TTL indexes in MongoDB are sufficient for our requirement of expiring keys after 24 hours.
