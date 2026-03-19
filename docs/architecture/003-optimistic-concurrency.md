# ADR 003: Optimistic Concurrency Control (OCC) for Orders

**Date**: $(date +%Y-%m-%d)
**Status**: Accepted

## Context
Our system experiences concurrent updates on the `Order` model. Specifically, a user might try to cancel an order from the client via the API at the exact same millisecond that Stripe sends an async webhook confirming the payment was captured. Without concurrency control, we risk a "lost update" anomaly where the payment success overrides the cancellation, leaving the system in an inconsistent state.

## Decision
We considered Pessimistic Locking (via Redis Mutex) and Optimistic Concurrency Control (OCC). We chose **OCC using MongoDB's built-in `__v` version key** via the `mongoose-update-if-current` library. 

**Why not Redis Locks?**
Pessimistic locking introduces significant network latency overhead on every write and risks deadlocks if a pod crashes while holding a lock. Order write collisions are statistically rare (< 0.5% of requests), making Optimistic Locking far more efficient. If a collision occurs, the second request will simply fail with a `VersionError`, which we will catch and retry.
