import { isIP } from "node:net";

import type { AuthRequestContext } from "@/modules/auth/types/auth.types";

export function getAuthRequestContext(request: Request): AuthRequestContext {
  const forwardedIp = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const candidateIp = forwardedIp || realIp;
  const userAgent = request.headers.get("user-agent")?.trim();

  return {
    ip: candidateIp && isIP(candidateIp) ? candidateIp : undefined,
    userAgent:
      userAgent && userAgent.length <= 500 ? userAgent : undefined,
  };
}
