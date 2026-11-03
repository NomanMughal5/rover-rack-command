import type { Engine, Robot } from "@/sim/engine";

export const STATUS_COLORS: Record<string, string> = {
  idle: "#9aa3a0",
  moving: "#5fb07a",
  carrying: "#f08a4b",
  waiting: "#e2524a",
  loading: "#7b6fd0",
};

export function robotColor(engine: Engine, r: Robot) {
  if (engine.isWaiting(r)) return STATUS_COLORS.waiting;
  if (r.status === "loading" || r.status === "unloading") return STATUS_COLORS.loading;
  if (r.packageId) return STATUS_COLORS.carrying;
  if (r.moving) return STATUS_COLORS.moving;
  return STATUS_COLORS.idle;
}
