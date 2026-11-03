import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, MapPin, Navigation, Package } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useEngine } from "@/sim/store";
import type { Engine, Robot } from "@/sim/engine";
import { BatteryBar, Panel, RobotStatus } from "@/components/dashboard/common";
import { RobotDetails } from "@/components/dashboard/RobotInfoPanel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Robot Fleet · Warehouse Operations" },
      { name: "description", content: "Status, battery, position and assignments for every autonomous mobile robot." },
      { property: "og:title", content: "Robot Fleet · Warehouse Operations" },
      { property: "og:description", content: "Status, battery, position and assignments for every autonomous mobile robot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FleetPage,
});

const FILTERS = [
  { id: "all", label: "All robots", test: () => true },
  { id: "active", label: "Active", test: (e: Engine, r: Robot) => r.status !== "idle" && !e.isWaiting(r) },
  { id: "idle", label: "Idle", test: (_: Engine, r: Robot) => r.status === "idle" },
  { id: "waiting", label: "Waiting", test: (e: Engine, r: Robot) => e.isWaiting(r) },
  { id: "carrying", label: "Carrying packages", test: (_: Engine, r: Robot) => !!r.packageId },
] as const;

function destination(e: Engine, r: Robot) {
  const t = e.task(r.taskId);
  if (!t) return r.status === "returning" ? "Charging bay" : "—";
  return r.packageId ? t.delivery : t.pickup;
}

function FleetPage() {
  const engine = useEngine();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const f = FILTERS.find((x) => x.id === filter)!;
  const robots = engine.robots.filter((r) => f.test(engine, r));
  const open = engine.robot(openId);
  return (
    <div className="mx-auto flex max-w-[1680px] flex-col gap-5">
      <div>
        <h1 className="text-[30px] font-light tracking-tight">Robot Fleet</h1>
        <p className="text-[13px] text-muted-foreground">{engine.robots.length} autonomous mobile robots in Zone B</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((x) => {
          const n = engine.robots.filter((r) => x.test(engine, r)).length;
          return (
            <button
              key={x.id}
              onClick={() => setFilter(x.id)}
              className={cn(
                "flex h-9 items-center gap-2 rounded-full border px-4 text-[12px] font-semibold transition",
                filter === x.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-secondary",
              )}
            >
              {x.label}
              <span className={cn("rounded-full px-1.5 text-[10px]", filter === x.id ? "bg-primary-foreground/20" : "bg-secondary")}>{n}</span>
            </button>
          );
        })}
      </div>
      {robots.length === 0 && <Panel className="text-center text-[13px] text-muted-foreground">No robots match this filter right now.</Panel>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {robots.map((r) => (
          <button key={r.id} onClick={() => setOpenId(r.id)} className="rounded-3xl border bg-card p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-float">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold tracking-tight">{r.id}</div>
                <div className="text-[11px] text-muted-foreground">{r.model}</div>
              </div>
              <RobotStatus engine={engine} r={r} />
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Battery</span>
                <span className="font-mono font-semibold">{Math.round(r.battery)}%</span>
              </div>
              <BatteryBar value={r.battery} className="mt-1" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-xl bg-secondary/70 p-2">
                <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" /> Position</div>
                <div className="font-mono font-semibold">({r.x}, {r.y})</div>
              </div>
              <div className="rounded-xl bg-secondary/70 p-2">
                <div className="flex items-center gap-1 text-muted-foreground"><Navigation className="h-3 w-3" /> Destination</div>
                <div className="font-semibold">{destination(engine, r)}</div>
              </div>
              <div className="col-span-2 flex items-center justify-between rounded-xl bg-secondary/70 p-2">
                <span className="text-muted-foreground">Task</span>
                <span className="flex items-center gap-1 font-semibold">
                  {r.packageId && <Package className="h-3 w-3 text-primary" />}
                  {r.taskId ?? "Unassigned"}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-[380px] overflow-y-auto sm:max-w-[380px]">
          {open && (
            <>
              <SheetHeader className="px-0">
                <SheetTitle>{open.id}</SheetTitle>
                <SheetDescription>{open.name} · {open.model}</SheetDescription>
              </SheetHeader>
              <RobotDetails engine={engine} r={open} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
