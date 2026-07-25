import { logger } from "@/lib/logger";
import { AlertEngineService } from "@/modules/alerts/services/alert-engine.service";

let evaluationScheduled = false;

export function scheduleAlertEvaluation(): void {
  if (evaluationScheduled) return;
  evaluationScheduled = true;

  setTimeout(() => {
    evaluationScheduled = false;
    new AlertEngineService().runEngine().catch((error: unknown) => {
      logger.error("Alert evaluation after mutation failed", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    });
  }, 0);
}
