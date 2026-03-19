# Prometheus Metrics Integration

## Why prom-client?
We chose `prom-client` because:
- Native Prometheus ecosystem support
- Zero external dependencies
- Works well in containerized environments

Alternatives like OpenTelemetry were considered but rejected for being too heavy for this service.

## Exposed Endpoint
GET /metrics

## Metrics Included
- Default Node.js metrics (CPU, memory, GC)
- HTTP request duration histogram

## Known Quirk
We saw duplicate metric registration during hot reload in dev.
Workaround: guard with `getSingleMetric`.

## Future Improvements
- Add RabbitMQ metrics
- Add Mongo query latency tracking
