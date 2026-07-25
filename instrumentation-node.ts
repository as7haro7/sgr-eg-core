import { logger } from "@/lib/logger";
import { AlertEngineService } from "@/modules/alerts/services/alert-engine.service";

const SCHEDULER_INTERVAL_MS = 60 * 60 * 1_000;

type SchedulerGlobal = typeof globalThis & {
  __sgrAlertScheduler?: ReturnType<typeof setInterval>;
  __sgrAlertStartup?: ReturnType<typeof setTimeout>;
};

export function registerNodeInstrumentation() {
  if (
    process.env.npm_lifecycle_event === "build" ||
    process.env.ALERT_SCHEDULER_ENABLED === "false"
  ) {
    return;
  }

  const schedulerGlobal = globalThis as SchedulerGlobal;
  if (schedulerGlobal.__sgrAlertScheduler || schedulerGlobal.__sgrAlertStartup) {
    return;
  }

  const alertEngine = new AlertEngineService();
  const run = () =>
    alertEngine.runEngine().catch((error: unknown) => {
      logger.error("Scheduled alert engine failed", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    });

  schedulerGlobal.__sgrAlertStartup = setTimeout(() => {
    schedulerGlobal.__sgrAlertStartup = undefined;
    void run();
    schedulerGlobal.__sgrAlertScheduler = setInterval(
      () => void run(),
      SCHEDULER_INTERVAL_MS,
    );
  }, 10_000);
}
