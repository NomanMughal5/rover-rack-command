import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, MapPin, Navigation, Package, Cpu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useEngine, useSim } from "@/sim/store";
import type { Engine, Robot } from "@/sim/engine";
import { Panel } from "@/components/dashboard/common";
import { RobotDetails } from "@/components/dashboard/RobotInfoPanel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Autonomous Mobile Robot (AMR) Fleet" },
      { name: "description", content: "Live real-time kinematics, battery telemetry, and mission assignments for every autonomous mobile robot." },
      { property: "og:title", content: "Autonomous Mobile Robot (AMR) Fleet" },
      { property: "og:description", content: "Live real-time kinematics, battery telemetry, and mission assignments for every autonomous mobile robot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FleetPage,
});

const FILTERS = [
  { id: "all", label: "All AMRs", test: () => true },
  { id: "active", label: "Active", test: (e: Engine, r: Robot) => r.status !== "idle" && !e.isWaiting(r) },
  { id: "idle", label: "Idle", test: (_: Engine, r: Robot) => r.status === "idle" },
  { id: "waiting", label: "Waiting", test: (e: Engine, r: Robot) => e.isWaiting(r) },
  { id: "carrying", label: "Carrying Payload", test: (_: Engine, r: Robot) => !!r.packageId },
] as const;

function destination(e: Engine, r: Robot) {
  const t = e.task(r.taskId);
  if (!t) return r.status === "returning" ? "Charging Bay" : "None";
  return r.packageId ? t.delivery : t.pickup;
}

function statusBadgeInfo(engine: Engine, r: Robot) {
  if (engine.isWaiting(r)) {
    return { label: "WAITING", border: "border-amber-400", text: "text-amber-700", bg: "bg-amber-50" };
  }
  switch (r.status) {
    case "idle":
      return { label: "IDLE", border: "border-blue-400", text: "text-blue-600", bg: "bg-blue-50/70" };
    case "to_pickup":
      return { label: "MOVING_TO_PICKUP", border: "border-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50/70" };
    case "loading":
      return { label: "LOADING", border: "border-purple-400", text: "text-purple-700", bg: "bg-purple-50/70" };
    case "to_delivery":
      return { label: "MOVING_TO_DELIVERY", border: "border-orange-500", text: "text-orange-700", bg: "bg-orange-50/70" };
    case "unloading":
      return { label: "UNLOADING", border: "border-purple-400", text: "text-purple-700", bg: "bg-purple-50/70" };
    case "returning":
      return { label: "RETURNING_HOME", border: "border-sky-400", text: "text-sky-700", bg: "bg-sky-50/70" };
    default:
      return { label: "IDLE", border: "border-slate-300", text: "text-slate-600", bg: "bg-slate-50" };
  }
}

function FleetPage() {
  const engine = useEngine();
  const navigate = useNavigate();
  const select = useSim((s) => s.select);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const f = FILTERS.find((x) => x.id === filter)!;
  const robots = engine.robots.filter((r) => f.test(engine, r));
  const open = engine.robot(openId);

  const handleInspectIn3D = (robotId: string, ev: React.MouseEvent) => {
    ev.stopPropagation();
    select(robotId);
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col gap-1 border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Autonomous Mobile Robot (AMR) Fleet
        </h1>
        <p className="text-xs font-normal text-muted-foreground sm:text-sm">
          Live real-time kinematics, battery telemetry, and mission assignments
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((x) => {
          const count = engine.robots.filter((r) => x.test(engine, r)).length;
          const isActive = filter === x.id;
          return (
            <button
              key={x.id}
              onClick={() => setFilter(x.id)}
              className={cn(
                "flex h-9 items-center gap-2 rounded-full border px-4 text-xs font-medium transition",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {x.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-semibold",
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {robots.length === 0 && (
        <Panel className="text-center text-sm text-muted-foreground">
          No autonomous mobile robots match this filter right now.
        </Panel>
      )}

      {/* Fleet Cards Grid (Matches UI Requirements) */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {robots.map((r) => {
          const badge = statusBadgeInfo(engine, r);
          const batteryPercent = Math.round(r.battery);

          return (
            <div
              key={r.id}
              onClick={() => setOpenId(r.id)}
              className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              {/* Card Header: Robot Name & State Badge */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-slate-900">{r.id}</h2>
                    <span className="text-[10px] text-muted-foreground">{r.model}</span>
                  </div>
                </div>
                <div
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wider",
                    badge.border,
                    badge.text,
                    badge.bg,
                  )}
                >
                  {badge.label}
                </div>
              </div>

              {/* Prominent Battery Telemetry Bar */}
              <div className="my-4">
                <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                  <span>Battery Telemetry</span>
                  <span className="font-mono font-bold text-slate-900">{batteryPercent}%</span>
                </div>
                <div className="mt-1.5 flex h-6 w-full items-center overflow-hidden rounded-md border border-slate-200 bg-slate-100 p-0.5">
                  <div
                    className={cn(
                      "h-full rounded-sm transition-all duration-300",
                      batteryPercent > 50
                        ? "bg-emerald-500"
                        : batteryPercent > 20
                          ? "bg-amber-500"
                          : "bg-rose-500",
                    )}
                    style={{ width: `${batteryPercent}%` }}
                  />
                </div>
              </div>

              {/* Telemetry Metric Key-Value Rows */}
              <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" /> Pose (X, Y):
                  </span>
                  <span className="font-mono font-semibold text-slate-900">
                    ({r.x}, {r.y})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Navigation className="h-3.5 w-3.5 text-slate-400" /> Distance Traveled:
                  </span>
                  <span className="font-semibold text-slate-900">{r.distance} cells</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="inline-block h-3.5 w-3.5 text-center font-bold text-slate-400">⏱</span>
                    Wait / Yield Ticks:
                  </span>
                  <span className="font-semibold text-slate-900">{r.totalWait} ticks</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Package className="h-3.5 w-3.5 text-slate-400" /> Payload:
                  </span>
                  <span className="font-semibold text-slate-900">
                    {r.packageId ? `${r.packageId} (${destination(engine, r)})` : "Deck Empty"}
                  </span>
                </div>
              </div>

              {/* Bottom Card Action: Inspect in 3D Map */}
              <div className="mt-4 pt-3">
                <button
                  type="button"
                  onClick={(ev) => handleInspectIn3D(r.id, ev)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 active:bg-slate-200"
                >
                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                  Inspect in 3D Map
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-out Inspection Sheet for AMR Details */}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-[380px] overflow-y-auto sm:max-w-[420px]">
          {open && (
            <>
              <SheetHeader className="px-0">
                <SheetTitle className="text-xl font-bold">{open.id}</SheetTitle>
                <SheetDescription>
                  {open.name} · {open.model}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <RobotDetails engine={engine} r={open} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
