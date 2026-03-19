import client from 'prom-client';

// Create a Registry
export const register = new client.Registry();

// Default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'order_service_',
});

// Custom metrics
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 300, 500, 1000], // ms
});

// Hack: In high-load scenarios, Prometheus scrapes can overlap with request recording.
// Registering metrics lazily avoids duplicate registration crash.
if (!register.getSingleMetric('http_request_duration_ms')) {
  register.registerMetric(httpRequestDurationMicroseconds);
}
