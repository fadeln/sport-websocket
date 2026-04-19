import { MATCH_STATUS } from "../validation/matches.js";

/**
 * Determine the lifecycle status of a match from its start and end timestamps.
 *
 * @param startTime - The match start time (Date, ISO string, or epoch milliseconds)
 * @param endTime - The match end time (Date, ISO string, or epoch milliseconds)
 * @param now - Reference Date used to evaluate the status; defaults to the current time
 * @returns `MATCH_STATUS.SCHEDULED` if `now` is before `startTime`, `MATCH_STATUS.FINISHED` if `now` is at or after `endTime`, `MATCH_STATUS.LIVE` if `now` is greater than or equal to `startTime` and before `endTime`, or `null` if either timestamp cannot be parsed as a valid date
 */
export function getMatchStatus(
  startTime: string | number | Date,
  endTime: string | number | Date,
  now = new Date(),
) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (now < start) {
    return MATCH_STATUS.SCHEDULED;
  }

  if (now >= end) {
    return MATCH_STATUS.FINISHED;
  }

  return MATCH_STATUS.LIVE;
}

/**
 * Synchronizes a match object's status with its scheduled timeframe.
 *
 * @param match - Object containing `startTime`, `endTime`, and `status`. `startTime` and `endTime` may be a `string`, `number`, or `Date`.
 * @param updateStatus - Callback invoked with the new status when an update is required.
 * @returns The match's `status` after synchronization; if the computed status cannot be determined, returns the original `match.status`.
 */
export async function syncMatchStatus(
  match: {
    startTime: string | number | Date;
    endTime: string | number | Date;
    status: string;
  },
  updateStatus: (arg0: string) => any,
) {
  const nextStatus = getMatchStatus(match.startTime, match.endTime);
  if (!nextStatus) {
    return match.status;
  }
  if (match.status !== nextStatus) {
    await updateStatus(nextStatus);
    match.status = nextStatus;
  }
  return match.status;
}
