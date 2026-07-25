import nodemailer from "nodemailer";

import { getEmailEnv } from "@/config/env";
import { logger } from "@/lib/logger";

export interface AlertEmail {
  email: string;
  message: string;
  ruleCode: string;
  severity: string;
}

export class AlertEmailService {
  async notify(alerts: AlertEmail[]): Promise<void> {
    if (alerts.length === 0) return;
    const env = getEmailEnv();
    if (!env) {
      logger.warn("SMTP is not configured; alert emails were skipped", {
        alertCount: alerts.length,
      });
      return;
    }
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    });
    const deliveries = await Promise.allSettled(
      alerts.map((alert) =>
        transporter.sendMail({
          from: env.SMTP_FROM,
          to: alert.email,
          subject: `[${alert.severity.toUpperCase()}] Alerta ${alert.ruleCode} SGR-EG`,
          text: `${alert.message}\n\nIngresa al SGR-EG para revisar y atender la alerta.`,
        }),
      ),
    );
    const failed = deliveries.filter(
      (delivery) => delivery.status === "rejected",
    ).length;
    if (failed > 0) {
      logger.error("Some alert emails could not be delivered", { failed });
    }
  }
}
