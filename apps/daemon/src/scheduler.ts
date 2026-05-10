import type { DreamDomainStats, DreamResult } from "../../../packages/runtime/src/index.js";

export const defaultDreamCron = "0 3 * * *";
export const defaultDreamSchedulerIntervalMs = 60 * 60 * 1000;

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

export interface DreamSchedulerStatus {
  readonly running: boolean;
  readonly lastRunAt: string | null;
  readonly runs: number;
}

export interface DreamSchedulerOptions {
  dream(domainStats: Readonly<Record<string, DreamDomainStats>>): DreamResult;
  getDomainStats(): Readonly<Record<string, DreamDomainStats>>;
  readonly now?: () => Date;
  readonly intervalMs?: number;
  readonly scheduledHourUtc?: number;
  readonly setInterval?: (callback: () => void, intervalMs: number) => unknown;
  readonly clearInterval?: (handle: unknown) => void;
}

export interface DreamScheduler {
  tick(now?: Date): DreamResult | null;
  start(): void;
  stop(): void;
  status(): DreamSchedulerStatus;
}

export function createDreamScheduler(options: DreamSchedulerOptions): DreamScheduler {
  const now = options.now ?? (() => new Date());
  const intervalMs = options.intervalMs ?? defaultDreamSchedulerIntervalMs;
  const scheduleInterval =
    options.setInterval ?? ((callback: () => void, ms: number) => globalThis.setInterval(callback, ms));
  const clearScheduleInterval =
    options.clearInterval ?? ((timerHandle: unknown) => globalThis.clearInterval(timerHandle as ReturnType<typeof globalThis.setInterval>));
  let handle: unknown;
  let lastRunAt: Date | null = null;
  let runs = 0;

  return {
    tick(tickNow = now()) {
      const scheduleInput =
        options.scheduledHourUtc === undefined
          ? { now: tickNow, lastRunAt }
          : { now: tickNow, lastRunAt, scheduledHourUtc: options.scheduledHourUtc };
      if (!shouldRunDream(scheduleInput)) {
        return null;
      }

      const result = options.dream(options.getDomainStats());
      lastRunAt = tickNow;
      runs += 1;
      return result;
    },
    start() {
      if (handle !== undefined) {
        return;
      }

      handle = scheduleInterval(() => {
        this.tick();
      }, intervalMs);
    },
    stop() {
      if (handle === undefined) {
        return;
      }

      clearScheduleInterval(handle);
      handle = undefined;
    },
    status() {
      return {
        running: handle !== undefined,
        lastRunAt: lastRunAt?.toISOString() ?? null,
        runs,
      };
    },
  };
}
