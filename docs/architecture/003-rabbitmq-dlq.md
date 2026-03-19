# ADR 003: RabbitMQ Dead Letter Queue (DLQ) Strategy

## Status
Accepted

## Context
Our asynchronous event processing for order creation and inventory allocation occasionally encounters poison pill messages (e.g., malformed payloads, downstream service outages). Currently, these messages infinitely requeue, causing high CPU load and delaying valid events.

## Decision
We will implement a Domain-Specific Dead Letter Exchange (DLX) rather than a global one. 
Each primary exchange (e.g., `order-events`) will route failed messages to its counterpart `order-events-dlx`.

Why not a global DLX?
A global DLX obscures the origin of the failure and makes automated replay scripts overly complex. By keeping the DLX domain-bound, we can easily pipe dead-lettered order events back into the `order-events` queue after applying a hotfix, without accidentally mixing them with payment or inventory events.

## Consequences
- Requires updating queue assertions in `src/events/rabbitmqSetup.ts`.
- Operations team will need a new runbook for monitoring `*-dlq` queues.
