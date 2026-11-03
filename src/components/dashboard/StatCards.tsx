import { Bot, CheckCircle2, ListChecks, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useEngine } from "@/sim/store";
import { cn } from "@/lib/utils";

function Card({
  icon,
  label,
  value,
  tone,
  rows,
  footer,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone: string;
  rows: [string, ReactNode][];
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className={cn("grid h-8 w-8 place-items-center rounded-xl", tone)}>{icon}</span>
        <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="text-[32px] font-light leading-none tracking-tight">{value}</div>
        {footer}
      </div>
      <div className="mt-3 flex gap-3 border-t pt-3">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="text-[13px] font-semibold">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-8 items-end gap-[3px]">
      {values.map((v, i) => (
        <span key={i} className="w-[4px] rounded-full bg-success/70" style={{ height: `${15 + (v / max) * 85}%` }} />
      ))}
    </div>
  );
}

export function StatCards() {
  const e = useEngine();
  const active = e.robots.filter((r) => r.status !== "idle").length;
  const t = (s: string) => e.tasks.filter((x) => x.status === s).length;
  const done = t("completed");
  const rate = e.tasks.length ? Math.round((done / e.tasks.length) * 100) : 0;
  const resolved = e.conflicts.filter((c) => c.resolved).length;
  const warnings = e.robots.filter((r) => e.isWaiting(r)).length;
  // deliveries per 10-tick bucket
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const end = e.tick - (11 - i) * 10;
    return e.tasks.filter((x) => x.completedTick !== null && x.completedTick > end - 10 && x.completedTick <= end).length;
  });
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        icon={<Bot className="h-4 w-4" />}
        tone="bg-primary-soft text-primary"
        label="Total Robots"
        value={e.robots.length}
        rows={[
          ["Active", active],
          ["Idle", e.robots.length - active],
        ]}
        footer={
          <div className="flex gap-1">
            {e.robots.map((r) => (
              <span key={r.id} className={cn("h-6 w-1.5 rounded-full", r.status === "idle" ? "bg-muted" : "bg-primary")} />
            ))}
          </div>
        }
      />
      <Card
        icon={<ListChecks className="h-4 w-4" />}
        tone="bg-violet-soft text-violet"
        label="Active Missions"
        value={t("in_progress") + t("assigned")}
        rows={[
          ["Running", t("in_progress")],
          ["Assigned", t("assigned")],
          ["Pending", t("pending")],
        ]}
      />
      <Card
        icon={<CheckCircle2 className="h-4 w-4" />}
        tone="bg-success-soft text-success"
        label="Completed Deliveries"
        value={done}
        rows={[
          ["Completion", `${rate}%`],
          ["Total tasks", e.tasks.length],
        ]}
        footer={<Spark values={buckets} />}
      />
      <Card
        icon={<ShieldAlert className="h-4 w-4" />}
        tone="bg-danger-soft text-destructive"
        label="Collision Monitoring"
        value={e.conflicts.length}
        rows={[
          ["Resolved", resolved],
          ["Warnings", <span key="w" className={warnings ? "text-destructive" : ""}>{warnings}</span>],
          ["Replans", e.replans],
        ]}
      />
    </div>
  );
}
