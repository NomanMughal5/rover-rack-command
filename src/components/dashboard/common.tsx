import type { ReactNode } from "react";
import type { Engine, Robot, TaskStatus } from "@/sim/engine";
import { cn } from "@/lib/utils";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-3xl border bg-card p-5 shadow-card", className)}>{children}</div>;
}

export function PanelTitle({ icon, title, right }: { icon?: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {icon && <span className="grid h-7 w-7 place-items-center rounded-lg bg-secondary text-muted-foreground">{icon}</span>}
      <h3 className="text-[14px] font-semibold tracking-tight">{title}</h3>
      <div className="ml-auto">{right}</div>
    </div>
  );
}

export type Tone = "green" | "orange" | "red" | "violet" | "blue" | "grey";
const TONES: Record<Tone, string> = {
  green: "bg-success-soft text-success",
  orange: "bg-primary-soft text-primary",
  red: "bg-danger-soft text-destructive",
  violet: "bg-violet-soft text-violet",
  blue: "bg-info-soft text-info",
  grey: "bg-secondary text-muted-foreground",
};

export function Pill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function robotTone(engine: Engine, r: Robot): Tone {
  if (engine.isWaiting(r)) return "red";
  if (r.status === "loading" || r.status === "unloading") return "violet";
  if (r.packageId) return "orange";
  if (r.status === "returning") return "blue";
  if (r.moving) return "green";
  return "grey";
}

export function RobotStatus({ engine, r }: { engine: Engine; r: Robot }) {
  return <Pill tone={robotTone(engine, r)}>{engine.displayStatus(r)}</Pill>;
}

export const TASK_TONE: Record<TaskStatus, Tone> = {
  pending: "grey",
  assigned: "blue",
  in_progress: "orange",
  completed: "green",
};
export const TASK_LABEL: Record<TaskStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
};

export function BatteryBar({ value, className }: { value: number; className?: string }) {
  const tone = value > 50 ? "bg-success" : value > 25 ? "bg-warning" : "bg-destructive";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${value}%` }} />
    </div>
  );
}

export function efficiency(engine: Engine, r: Robot) {
  const t = Math.max(1, engine.tick);
  return Math.round(Math.min(99, 55 + (r.busyTicks / t) * 40 + r.completed * 2 - (r.totalWait / t) * 30));
}

export function simTime(engine: Engine, tick: number) {
  return new Date(Date.UTC(2026, 10, 3, 8, 0, 0) + tick * 4000).toISOString().slice(11, 19);
}
