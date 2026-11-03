import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeftRight, Ban, Clock, GitBranch, ListTree, Route as RouteIcon, ScrollText } from "lucide-react";
import { useEngine, useSim } from "@/sim/store";
import type { Engine } from "@/sim/engine";
import { Panel, PanelTitle, Pill, simTime } from "@/components/dashboard/common";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/paths")({
  head: () => ({
    meta: [
      { title: "Path & Collision Monitoring · Warehouse Operations" },
      { name: "description", content: "A* routes, time-based reservation table, conflict detection and replanning events." },
      { property: "og:title", content: "Path & Collision Monitoring · Warehouse Operations" },
      { property: "og:description", content: "A* routes, time-based reservation table, conflict detection and replanning events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PathsPage,
});

const ROBOT_HUES = ["#ef7a3c", "#5f8f62", "#7b6fd0", "#4a86c5", "#d4a13a", "#c25b7a", "#3aa59a", "#8a6d4f"];

function GridMap({ engine }: { engine: Engine }) {
  const { selectedId, select } = useSim();
  const S = 22;
  return (
    <svg viewBox={`0 0 ${engine.W * S} ${engine.H * S}`} className="w-full rounded-2xl bg-secondary/50">
      {engine.blocked.map((row, y) =>
        row.map((b, x) =>
          b ? <rect key={`${x}-${y}`} x={x * S + 1} y={y * S + 1} width={S - 2} height={S - 2} rx={3} fill="var(--border)" /> : null,
        ),
      )}
      {engine.locations.map((l) => (
        <rect key={l.id} x={l.cell.x * S + 3} y={l.cell.y * S + 3} width={S - 6} height={S - 6} rx={4} fill="none" stroke={l.kind === "pickup" ? "var(--primary)" : "var(--success)"} strokeWidth={1.5} strokeDasharray="3 2" />
      ))}
      {engine.reservations
        .filter((r) => r.t > engine.tick)
        .map((r, i) => (
          <rect key={i} x={r.cell.x * S + 6} y={r.cell.y * S + 6} width={S - 12} height={S - 12} rx={2} fill={ROBOT_HUES[engine.robots.findIndex((x) => x.id === r.robotId)]} opacity={0.25} />
        ))}
      {engine.robots.map((r, i) =>
        r.route.length > 1 ? (
          <polyline
            key={r.id}
            points={[{ x: r.x, y: r.y }, ...r.path].map((c) => `${c.x * S + S / 2},${c.y * S + S / 2}`).join(" ")}
            fill="none"
            stroke={ROBOT_HUES[i]}
            strokeWidth={selectedId === r.id ? 4 : 2}
            strokeLinejoin="round"
            opacity={selectedId && selectedId !== r.id ? 0.25 : 0.9}
          />
        ) : null,
      )}
      {engine.robots.map((r, i) => (
        <g key={r.id} onClick={() => select(r.id)} className="cursor-pointer">
          <circle cx={r.x * S + S / 2} cy={r.y * S + S / 2} r={8} fill={ROBOT_HUES[i]} stroke={engine.isWaiting(r) ? "var(--destructive)" : "var(--card)"} strokeWidth={2.5} />
          <text x={r.x * S + S / 2} y={r.y * S + S / 2 + 3} textAnchor="middle" fontSize={8} fontWeight={700} fill="var(--card)">
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

function PathsPage() {
  const engine = useEngine();
  const { selectedId, select } = useSim();
  const recentConflicts = engine.conflicts.slice(0, 8);
  const waiting = engine.robots.filter((r) => engine.isWaiting(r));
  const upcoming = engine.reservations.filter((r) => r.t > engine.tick).sort((a, b) => a.t - b.t || a.robotId.localeCompare(b.robotId));
  const times = Array.from({ length: 5 }, (_, i) => engine.tick + i + 1);
  return (
    <div className="mx-auto flex max-w-[1680px] flex-col gap-5">
      <div>
        <h1 className="text-[30px] font-light tracking-tight">Path & Collision Monitoring</h1>
        <p className="text-[13px] text-muted-foreground">A* on a 4-connected grid graph · time-indexed reservation table · tick {engine.tick}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Detected conflicts", engine.conflicts.length, <AlertTriangle key="a" className="h-4 w-4" />, "bg-danger-soft text-destructive"],
          ["Blocked movements", engine.blockedMoves, <Ban key="b" className="h-4 w-4" />, "bg-warning-soft text-warning"],
          ["Waiting robots", waiting.length, <Clock key="c" className="h-4 w-4" />, "bg-violet-soft text-violet"],
          ["Opposite-direction", engine.swapConflicts, <ArrowLeftRight key="d" className="h-4 w-4" />, "bg-info-soft text-info"],
          ["Replanning events", engine.replans, <GitBranch key="e" className="h-4 w-4" />, "bg-success-soft text-success"],
        ].map(([l, v, icon, tone]) => (
          <div key={l as string} className="flex items-center gap-3 rounded-3xl border bg-card p-4 shadow-card">
            <span className={cn("grid h-10 w-10 place-items-center rounded-2xl", tone as string)}>{icon}</span>
            <div>
              <div className="text-[24px] font-light leading-none">{v}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{l}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel>
          <PanelTitle icon={<RouteIcon className="h-3.5 w-3.5" />} title="Active A* routes" right={<span className="text-[11px] text-muted-foreground">Shaded cells = reservations t+1…t+5</span>} />
          <GridMap engine={engine} />
          <table className="mt-4 w-full text-[12px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 font-medium">Robot</th>
                <th className="pb-2 font-medium">Start</th>
                <th className="pb-2 font-medium">Destination</th>
                <th className="pb-2 font-medium">Length</th>
                <th className="pb-2 font-medium">Remaining</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {engine.robots.map((r, i) => {
                const has = r.route.length > 1;
                return (
                  <tr key={r.id} onClick={() => select(selectedId === r.id ? null : r.id)} className={cn("cursor-pointer border-t hover:bg-secondary/60", selectedId === r.id && "bg-primary-soft")}>
                    <td className="py-1.5 font-semibold">
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: ROBOT_HUES[i] }} />
                      {r.id}
                    </td>
                    <td className="py-1.5 font-mono">{has ? `(${r.route[0].x},${r.route[0].y})` : "—"}</td>
                    <td className="py-1.5 font-mono">{r.goal ? `(${r.goal.x},${r.goal.y})` : "—"}</td>
                    <td className="py-1.5">{has ? r.route.length - 1 : 0}</td>
                    <td className="py-1.5">{r.path.length}</td>
                    <td className="py-1.5">
                      {engine.isWaiting(r) ? <Pill tone="red">Blocked</Pill> : r.path.length ? <Pill tone="green">Following</Pill> : has ? <Pill tone="violet">Arrived</Pill> : <Pill tone="grey">No route</Pill>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
        <div className="flex flex-col gap-5">
          <Panel>
            <PanelTitle icon={<ListTree className="h-3.5 w-3.5" />} title="Reservation table" right={<span className="text-[11px] text-muted-foreground">{upcoming.length} reserved cells</span>} />
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 font-medium">Robot</th>
                    <th className="pb-2 font-medium">Now</th>
                    {times.map((t) => (
                      <th key={t} className="pb-2 font-medium">t{t - engine.tick > 0 ? `+${t - engine.tick}` : ""}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {engine.robots.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-1.5 font-semibold">{r.id.slice(4)}</td>
                      <td className="py-1.5 font-mono">{r.x},{r.y}</td>
                      {times.map((t) => {
                        const res = upcoming.find((u) => u.robotId === r.id && u.t === t);
                        return (
                          <td key={t} className="py-1.5">
                            {res ? <span className="rounded-md bg-primary-soft px-1.5 py-0.5 font-mono text-primary">{res.cell.x},{res.cell.y}</span> : <span className="text-muted-foreground">·</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel>
            <PanelTitle icon={<AlertTriangle className="h-3.5 w-3.5" />} title="Collision monitoring" />
            {recentConflicts.length === 0 && <div className="text-[12px] text-muted-foreground">No conflicts detected yet.</div>}
            <ul className="space-y-1.5">
              {recentConflicts.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-[12px]">
                  <Pill tone={c.kind === "swap" ? "blue" : "orange"}>{c.kind === "swap" ? "Opposite" : "Cell"}</Pill>
                  <span className="flex-1 truncate">{c.robots.join(" · ")} at ({c.cell.x},{c.cell.y})</span>
                  <Pill tone={c.resolved ? "green" : "red"}>{c.resolved ? "Resolved" : "Active"}</Pill>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
      <Panel>
        <PanelTitle icon={<ScrollText className="h-3.5 w-3.5" />} title="Event log" />
        <ul className="grid max-h-[320px] gap-1 overflow-y-auto md:grid-cols-2">
          {engine.events.slice(0, 40).map((e) => (
            <li key={e.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-[12px] hover:bg-secondary/60">
              <span className="font-mono text-[10px] text-muted-foreground">{simTime(engine, e.tick)}</span>
              <Pill
                tone={({ assign: "blue", pickup: "orange", deliver: "green", conflict: "red", wait: "violet", replan: "grey", task: "grey", system: "grey" } as const)[e.type]}
                className="w-16 justify-center text-[10px] capitalize"
              >
                {e.type}
              </Pill>
              <span className="truncate">{e.message}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
