import { Router } from "express";
import {
  createMatchSchema,
  listMatchesQuerySchema,
  MATCH_STATUS,
  matchIdParamSchema,
} from "../validation/matches.js";
import { createCommentarySchema } from "../validation/commentary.js";
import { matches, commentary } from "../db/schema.js";
import { db } from "../db/db.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc, eq } from "drizzle-orm";

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid query",
      details: parsed.error.issues,
    });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);

    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: "Failed to list matches." });
  }
});

matchRouter.post("/:matchId/commentary", async (req, res) => {
  const matchIdParsed = matchIdParamSchema.safeParse({ id: req.params.matchId });
  const bodyParsed = createCommentarySchema.safeParse(req.body);

  if (!matchIdParsed.success || !bodyParsed.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: !matchIdParsed.success
        ? matchIdParsed.error.issues
        : bodyParsed.error.issues,
    });
  }

  try {
    const { minutes, sequence, period, eventType, actor, team, message, metadata, tags } = bodyParsed.data;
    const [newCommentary] = await db
      .insert(commentary)
      .values({
        matchId: matchIdParsed.data.id,
        minute: minutes,
        sequence,
        period,
        eventType,
        actor: actor ?? null,
        team: team ?? null,
        message,
        metadata: metadata ?? {},
        tags,
      })
      .returning();

    res.status(201).json({ data: newCommentary });

    // Broadcast commentary creation
    if (res.app.locals.broadcastCommentaryCreated) {
      try {
        res.app.locals.broadcastCommentaryCreated(newCommentary);
      } catch (broadcastError) {
        console.error("Failed to broadcast commentary created event:", broadcastError);
      }
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create commentary" });
  }
});

matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid payload",
      details: parsed.error.issues,
    });
  }

  const {
    sport,
    homeTeam,
    awayTeam,
    startTime,
    endTime,
    homeScore,
    awayScore,
  } = parsed.data;
  const status = getMatchStatus(startTime, endTime) || MATCH_STATUS.SCHEDULED;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        sport,
        homeTeam,
        awayTeam,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status,
      })
      .returning();

    res.status(201).json({ data: event });

    // Broadcast match creation as a non-critical side effect
    // Wrap in try/catch to ensure failures don't affect the HTTP response
    if (res.app.locals.broadcastMatchCreated) {
      try {
        res.app.locals.broadcastMatchCreated(event);
      } catch (broadcastError) {
        console.error("Failed to broadcast match created event:", broadcastError);
      }
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: "failed to create match",
    });
  }
});