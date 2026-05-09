export interface DoctorResult {
  readonly ok: boolean;
  readonly checks: readonly string[];
}

export function doctorCommand(): DoctorResult {
  return {
    ok: true,
    checks: ["state:in-memory", "provider:local", "world:filesystem"],
  };
}
