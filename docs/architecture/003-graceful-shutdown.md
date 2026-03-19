# ADR 003: Graceful Shutdown Implementation

## Status
Accepted

## Context
When performing zero-downtime deployments via Kubernetes, pods are sent a SIGTERM signal before being killed. If the Express server is instantly killed, any in-flight requests (such as processing a Stripe webhook or completing a long MongoDB transaction) are dropped, resulting in 502 Bad Gateway errors for clients and potentially corrupt state. 

## Decision
We will implement native NodeJS signal listeners (`SIGTERM` and `SIGINT`) instead of relying on a third-party library like `@godaddy/terminus` or `lightship`. Native handlers reduce our dependency footprint and give us explicit control over the teardown sequence:
1. Stop accepting new HTTP requests.
2. Drain existing HTTP requests.
3. Close the RabbitMQ connection.
4. Close the MongoDB connection.
5. Exit the process.

## Consequences
- We must ensure our Dockerfile relies on `node` directly rather than `npm start`, as npm swallows SIGTERM signals.
- Kubernetes `terminationGracePeriodSeconds` must be set higher than our maximum expected request duration (e.g., 30 seconds).
