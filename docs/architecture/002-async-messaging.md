# ADR 002: Asynchronous Messaging with RabbitMQ

**Date**: 2026-02-24
**Status**: Accepted

## Context
When an order is created, we need to reserve inventory and initiate payment processing. Doing this synchronously via HTTP calls to the `inventory-service` and `payment-service` creates tight coupling and poor fault tolerance (if the inventory service is down, order creation fails).

## Decision
We will implement an event-driven architecture using RabbitMQ. The Order service will publish an `OrderCreated` event to a topic exchange. Downstream services will consume this event independently.

## Consequences
- **Positive**: High availability for order ingestion; services are decoupled.
- **Negative**: Eventual consistency introduced. We will need a saga pattern or compensation transactions later if inventory reservation fails after order creation.
