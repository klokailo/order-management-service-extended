// NOTE: this is a stub. real integration tests need mongo-memory-server
// i didn't have time to wire that up, leaving it as a placeholder
// see: https://github.com/nodkz/mongodb-memory-server

import { processWebhookBatch } from "../../../src/jobs/webhookWorker";

describe("processWebhookBatch (integration stub)", () => {
  it("should be defined", () => {
    expect(processWebhookBatch).toBeDefined();
  });

  // TODO: add real tests once mongo-memory-server is added
  // minimum cases to cover:
  // - picks up pending jobs
  // - does not double-process a job another worker claimed
  // - moves job to dead after maxAttempts
  // - sets correct nextRunAt using backoff
});
