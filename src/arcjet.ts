import express, { type Request, type Response, type NextFunction } from "express";
import arcjet, { type ArcjetNodeRequest, detectBot, shield, slidingWindow } from "@arcjet/node";

const arcjetKey = process.env.ARCJET_KEY;

// Validate ARCJET_MODE explicitly
const rawMode = process.env.ARCJET_MODE;
if (rawMode && rawMode !== "DRY_RUN" && rawMode !== "LIVE") {
  throw new Error(
    `Invalid ARCJET_MODE: "${rawMode}". Allowed values are "DRY_RUN" or "LIVE".`
  );
}
const arcjetMode = rawMode === "DRY_RUN" ? "DRY_RUN" : "LIVE";

if (!arcjetKey) throw new Error("ARCJET_KEY environtmen variable is missing");

export const httpArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({
          mode: arcjetMode,
        }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({ mode: arcjetMode, interval: "10s", max: 50 }),
      ],
    })
  : null;

export const wsArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({
          mode: arcjetMode,
        }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({ mode: arcjetMode, interval: "2s", max: 5 }),
      ],
    })
  : null;

export function securityMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!httpArcjet) return next();

    try {
      const decision = await httpArcjet.protect(req as ArcjetNodeRequest);

      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return res.status(429).json({ error: "Too many requests" });
        }

        return res.status(403).json({ error: "Forbidden" });
      }
    } catch (e) {
      console.error("arcjet middleware error", e);
      return res.status(503).json({ error: "service unavailable" });
    }

    next();
  };
}