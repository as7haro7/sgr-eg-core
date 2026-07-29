import { logger } from "@/lib/logger";
import { AlertEngineService } from "@/modules/alerts/services/alert-engine.service";

const ALERT_EVALUATION_DELAY_MS = 2_000;

interface AlertEvaluationState {
  timer: ReturnType<typeof setTimeout> | null;
  running: boolean;
  rerunRequested: boolean;
}

const globalForAlertEvaluation = globalThis as typeof globalThis & {
  alertEvaluationState?: AlertEvaluationState;
};

const state =
  globalForAlertEvaluation.alertEvaluationState ??
  {
    timer: null,
    running: false,
    rerunRequested: false,
  };

if (process.env.NODE_ENV !== "production") {
  globalForAlertEvaluation.alertEvaluationState = state;
}

export function scheduleAlertEvaluation(): void {
  if (state.timer) return;

  if (state.running) {
    state.rerunRequested = true;
    return;
  }

  state.timer = setTimeout(() => {
    state.timer = null;
    state.running = true;

    new AlertEngineService()
      .runEngine()
      .catch((error: unknown) => {
        logger.error("Alert evaluation after mutation failed", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      })
      .finally(() => {
        state.running = false;

        if (state.rerunRequested) {
          state.rerunRequested = false;
          scheduleAlertEvaluation();
        }
      });
  }, ALERT_EVALUATION_DELAY_MS);
}
