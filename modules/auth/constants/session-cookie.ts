export const SESSION_COOKIE_NAME = "sgr_eg_session";

export const SESSION_COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;
