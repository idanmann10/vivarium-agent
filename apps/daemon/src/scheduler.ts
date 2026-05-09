export const defaultDreamCron = "0 3 * * *";

export interface DreamScheduleInput {
  readonly now: Date;
  readonly lastRunAt: Date | null;
  readonly scheduledHourUtc?: number;
}

export function shouldRunDream({ now, lastRunAt, scheduledHourUtc = 3 }: DreamScheduleInput): boolean {
  if (now.getUTCHours() < scheduledHourUtc) {
    return false;
  }

  if (lastRunAt === null) {
    return true;
  }

  const elapsedMs = now.getTime() - lastRunAt.getTime();
  return elapsedMs >= 24 * 60 * 60 * 1000;
}
