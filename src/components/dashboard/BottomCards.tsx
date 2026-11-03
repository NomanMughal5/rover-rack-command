import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Trophy } from "lucide-react";
import { useEngine, useSim } from "@/sim/store";
import { BatteryBar, Panel, PanelTitle, RobotStatus, efficiency, simTime } from "./common";

export function TopRobots() {
  const engine = useEngine();
  const select = useSim((s) => s.select);
  const rows = [...engine.robots].sort((a, b) => b.completed - a.completed || b.distance - a.distance).slice(0, 6);
  return (
    <Panel>
      <PanelTitle icon={<Trophy className="h-3.5 w-3.5" />} title="Top Performing Robots" />
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="pb-2 font-medium">Robot</th>
            <th className="pb-2 font-medium">Completed</th>
            <th className="pb-2 font-medium">Battery</th>
            <th className="pb-2 font-medium">Efficiency</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const eff = efficiency(engine, r);
            return (
              <tr key={r.id} onClick={() => select(r.id)} className="cursor-pointer border-t hover:bg-secondary/60">
                <td className="py-2">
                  <div className="font-semibold">{r.id}</div>
                  <div className="text-[10px] text-muted-foreground">{r.model}</div>
                </td>
                <td className="py-2 font-medium">{r.completed} tasks</td>
                <td className="w-20 py-2">
                  <div className="font-mono text-[11px]">{Math.round(r.battery)}%</div>
                  <BatteryBar value={r.battery} className="h-1" />
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px]">{eff}%</span>
                    <div className="flex gap-[2px]">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span key={i} className={`h-3 w-[3px] rounded-full ${i < eff / 10 ? "bg-primary/70" : "bg-muted"}`} />
                      ))}
                    </div>
                  </div>
                </td>
                <td className="py-2">
                  <RobotStatus engine={engine} r={r} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

export function RobotActivity() {
  const engine = useEngine();
  const h = engine.history;
  const data = Array.from({ length: 12 }, (_, i) => {
    const end = engine.tick - (11 - i) * 10;
    const slice = h.filter((p) => p.tick > end - 10 && p.tick <= end);
    const done = engine.tasks.filter((t) => t.completedTick !== null && t.completedTick > end - 10 && t.completedTick <= end).length;
    const waiting = slice.reduce((a, p) => a + p.waiting, 0);
    return { label: end > 0 ? simTime(engine, Math.max(0, end)).slice(0, 5) : "—", completed: done, waiting };
  });
  const active = engine.tasks.filter((t) => t.status === "assigned" || t.status === "in_progress").length;
  const done = engine.tasks.filter((t) => t.status === "completed").length;
  const waitSec = engine.robots.reduce((a, r) => a + r.totalWait, 0) * 4;
  return (
    <Panel>
      <PanelTitle icon={<Activity className="h-3.5 w-3.5" />} title="Robot Activity" />
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Missions completed", done, "text-success"],
          ["Active missions", active, "text-primary"],
          ["Total waiting", `${waitSec}s`, "text-destructive"],
        ].map(([k, v, c]) => (
          <div key={k as string} className="rounded-2xl bg-secondary/70 p-3">
            <div className="text-[10px] text-muted-foreground">{k}</div>
            <div className={`text-[22px] font-light ${c}`}>{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -24, right: 4, top: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} cursor={{ fill: "var(--secondary)" }} />
            <Bar dataKey="completed" name="Deliveries" fill="var(--primary)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="waiting" name="Wait ticks" fill="var(--success)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 space-y-1.5">
        {engine.events
          .filter((e) => e.type === "deliver" || e.type === "pickup" || e.type === "assign")
          .slice(0, 3)
          .map((e) => (
            <li key={e.id} className="flex justify-between gap-2 text-[11px]">
              <span className="truncate">{e.message}</span>
              <span className="font-mono text-muted-foreground">{simTime(engine, e.tick)}</span>
            </li>
          ))}
      </ul>
    </Panel>
  );
}
