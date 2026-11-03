import { ClientOnly } from "@tanstack/react-router";
import { Suspense } from "react";
import { Activity, Battery, MapPin, Package, Route, X } from "lucide-react";
import { useEngine, useSim } from "@/sim/store";
import type { Engine, Robot } from "@/sim/engine";
import { LazyRobotPreview } from "@/components/warehouse/WarehouseView";
import { robotColor } from "@/components/warehouse/robotColor";
import { BatteryBar, Panel, RobotStatus, simTime } from "./common";

export function RobotDetails({ engine, r }: { engine: Engine; r: Robot }) {
  const task = engine.task(r.taskId);
  const pickup = task ? engine.loc(task.pickup) : null;
  const drop = task ? engine.loc(task.delivery) : null;
  const rows: [string, string][] = [
    ["Model", r.model],
    ["Coordinates", `(${r.x}, ${r.y})`],
    ["Assigned task", task?.id ?? "—"],
    ["Package", r.packageId ?? "—"],
    ["Pickup", pickup ? `${pickup.id} · ${pickup.label}` : "—"],
    ["Destination", drop ? `${drop.id} · ${drop.label}` : r.status === "returning" ? "Charging bay" : "—"],
    ["Distance travelled", `${r.distance} cells`],
    ["Route remaining", `${r.path.length} cells`],
    ["Deliveries", String(r.completed)],
  ];
  return (
    <div>
      <div className="relative h-40 overflow-hidden rounded-2xl bg-secondary">
        <ClientOnly fallback={null}>
          <Suspense fallback={null}>
            <LazyRobotPreview color={robotColor(engine, r)} carrying={!!r.packageId} />
          </Suspense>
        </ClientOnly>
        <div className="absolute left-3 top-3">
          <RobotStatus engine={engine} r={r} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-primary-soft p-3">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Battery className="h-3 w-3" /> Battery
          </div>
          <div className="mt-1 text-[22px] font-light">{Math.round(r.battery)}%</div>
          <BatteryBar value={r.battery} className="mt-1" />
        </div>
        <div className="rounded-2xl bg-success-soft p-3">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-success">
            <Route className="h-3 w-3" /> Travelled
          </div>
          <div className="mt-1 text-[22px] font-light">{r.distance}</div>
          <div className="text-[10px] text-muted-foreground">grid cells</div>
        </div>
      </div>
      <dl className="mt-3 divide-y text-[12px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-1.5">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="truncate text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function RobotInfoPanel() {
  const engine = useEngine();
  const { selectedId, select } = useSim();
  const r = engine.robot(selectedId);

  if (r) {
    return (
      <Panel className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <div>
            <div className="text-[16px] font-bold tracking-tight">{r.id}</div>
            <div className="text-[11px] text-muted-foreground">
              {r.name} · {r.model}
            </div>
          </div>
          <button onClick={() => select(null)} className="ml-auto grid h-8 w-8 place-items-center rounded-full hover:bg-secondary" aria-label="Close robot details">
            <X className="h-4 w-4" />
          </button>
        </div>
        <RobotDetails engine={engine} r={r} />
      </Panel>
    );
  }

  const moving = engine.robots.filter((x) => x.moving).length;
  const carrying = engine.robots.filter((x) => x.packageId).length;
  const avgBat = Math.round(engine.robots.reduce((a, x) => a + x.battery, 0) / engine.robots.length);
  return (
    <Panel className="p-4">
      <div className="text-[14px] font-semibold">Warehouse status</div>
      <div className="text-[11px] text-muted-foreground">Select a robot in the scene to inspect it</div>
      <div className="mt-4 rounded-2xl bg-primary p-4 text-primary-foreground">
        <div className="text-[11px] font-medium opacity-80">Fleet utilisation</div>
        <div className="text-[34px] font-light leading-tight">{Math.round((moving / engine.robots.length) * 100)}%</div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
          {[
            ["Moving", moving],
            ["Carrying", carrying],
            ["Avg battery", `${avgBat}%`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-primary-foreground/15 p-2">
              <div className="opacity-80">{k}</div>
              <div className="text-[15px] font-semibold">{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1.5">
        {engine.robots.map((x) => (
          <button key={x.id} onClick={() => select(x.id)} className="rounded-xl border p-1.5 text-left hover:border-primary">
            <div className="flex items-center gap-1 text-[10px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: robotColor(engine, x) }} />
              {x.id.slice(4)}
            </div>
            <BatteryBar value={x.battery} className="mt-1 h-1" />
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold">
        <Activity className="h-3.5 w-3.5 text-primary" /> Recent activity
      </div>
      <ul className="mt-2 space-y-2">
        {engine.events.slice(0, 6).map((e) => (
          <li key={e.id} className="flex gap-2 text-[11px]">
            {e.type === "pickup" || e.type === "deliver" ? (
              <Package className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            ) : (
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1 leading-snug">{e.message}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{simTime(engine, e.tick)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
