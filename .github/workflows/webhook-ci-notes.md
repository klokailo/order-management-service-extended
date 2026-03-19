# CI notes for webhook worker

The webhook worker process starts automatically on app boot (src/index.ts).

In CI, make sure MONGO_URI points to the test mongo instance or the worker will
throw on startup. We currently suppress this with a try/catch but its noisy in logs.

Also: the worker won't shut down cleanly in Jest because we don't have a global
afterAll that calls stopWebhookWorker(). This causes the "Jest did not exit" warning.
Fix is to add a jest global teardown. Someone should do that.
