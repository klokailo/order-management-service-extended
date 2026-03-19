import { WebhookJob, IWebhookJob } from "../models/WebhookJob";
import { dispatchWebhook } from "../webhooks/dispatcher";
import { nextAttemptDate } from "../webhooks/backoff";
import { logger } from "../utils/logger";

const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 25;

let isRunning = false;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

export async function processWebhookBatch(): Promise<void> {
  const now = new Date();

  const jobs = await WebhookJob.find({
    status: { $in: ["pending", "failed"] },
    nextRunAt: { $lte: now },
  })
    .limit(BATCH_SIZE)
    .lean<IWebhookJob[]>();

  if (jobs.length === 0) return;

  logger.debug(`Webhook worker picked up ${jobs.length} jobs`);

  for (const jobDoc of jobs) {
    const job = await WebhookJob.findOneAndUpdate(
      { _id: jobDoc._id, status: { $in: ["pending", "failed"] } },
      { $set: { status: "processing", lastAttemptAt: new Date() } },
      { new: true }
    );

    if (!job) continue;

    const result = await dispatchWebhook(job);

    // FIX: was doing job.attemptCount + 1 AFTER using it for nextAttemptDate
    // which meant attempt 0 was scheduled like attempt 1, all delays were one slot off
    // discovered because staging retries were coming in too fast
    const completedAttemptCount = job.attemptCount + 1;

    if (result.success) {
      await WebhookJob.updateOne(
        { _id: job._id },
        { $set: { status: "succeeded", lastError: undefined, attemptCount: completedAttemptCount } }
      );
      continue;
    }

    const isDead =
      completedAttemptCount >= job.maxAttempts ||
      result.errorMessage?.startsWith("Non-retryable");

    if (isDead) {
      logger.error("Webhook job exhausted all retries, moving to dead", {
        jobId: job._id,
        attempts: completedAttemptCount,
        lastError: result.errorMessage,
      });
      await WebhookJob.updateOne(
        { _id: job._id },
        {
          $set: {
            status: "dead",
            lastError: result.errorMessage,
            attemptCount: completedAttemptCount,
          },
        }
      );
    } else {
      // use completedAttemptCount for backoff so the delay actually grows
      const next = nextAttemptDate(completedAttemptCount);
      logger.info("Webhook job rescheduled", {
        jobId: job._id,
        nextRunAt: next,
        attempt: completedAttemptCount,
      });
      await WebhookJob.updateOne(
        { _id: job._id },
        {
          $set: {
            status: "failed",
            lastError: result.errorMessage,
            attemptCount: completedAttemptCount,
            nextRunAt: next,
          },
        }
      );
    }
  }
}

export function startWebhookWorker(): void {
  if (isRunning) {
    logger.warn("Webhook worker already running, ignoring start call");
    return;
  }
  isRunning = true;
  logger.info("Webhook worker started", { pollIntervalMs: POLL_INTERVAL_MS, batchSize: BATCH_SIZE });
  scheduleNextPoll();
}

function scheduleNextPoll(): void {
  pollTimer = setTimeout(async () => {
    try {
      await processWebhookBatch();
    } catch (err) {
      logger.error("Webhook worker poll cycle threw", { error: (err as Error).message });
    } finally {
      if (isRunning) scheduleNextPoll();
    }
  }, POLL_INTERVAL_MS);
}

export function stopWebhookWorker(): void {
  isRunning = false;
  if (pollTimer) clearTimeout(pollTimer);
  logger.info("Webhook worker stopped");
}
