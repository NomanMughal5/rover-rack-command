import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, Boxes, ClipboardList, Route as RouteIcon, Search, Warehouse, Bot, Circle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getEngine, startDriver, useEngine, useSim } from "@/sim/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Warehouse Simulation", icon: Warehouse },
  { to: "/fleet", label: "Robot Fleet", icon: Bot },
  { to: "/tasks", label: "Task Management", icon: ClipboardList },
  { to: "/paths", label: "Path & Collision", icon: RouteIcon },
] as const;

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-float">
        <Boxes className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-bold tracking-tight">Warehouse</div>
        <div className="text-[11px] font-medium text-muted-foreground">Operations</div>
      </div>
    </div>
  );
}

function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="sticky top-0 hidden h-screen w-[208px] shrink-0 flex-col border-r bg-sidebar px-3 py-5 md:flex">
      <div className="px-2">
        <Logo />
      </div>
      <nav className="mt-8 flex flex-col gap-1">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Operations
        </div>
        {NAV.map((n) => {
          const active = path === n.to;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                active ? "bg-primary-soft text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />}
              <n.icon className={cn("h-[18px] w-[18px]", active && "text-primary")} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-2xl border bg-background p-3">
        <div className="text-[11px] font-semibold">Engine</div>
        <div className="mt-1 text-[11px] leading-snug text-muted-foreground">
          Simulated data layer · ready for Java backend
        </div>
      </div>
    </aside>
  );
}

function GlobalSearch() {
  const engine = useEngine();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const select = useSim((s) => s.select);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const robots = engine.robots
      .filter((r) => r.id.toLowerCase().includes(s) || r.name.toLowerCase().includes(s))
      .map((r) => ({ kind: "robot" as const, id: r.id, sub: `${r.name} · ${engine.displayStatus(r)}` }));
    const tasks = engine.tasks
      .filter((t) => t.id.toLowerCase().includes(s) || t.packageId.toLowerCase().includes(s))
      .slice(0, 6)
      .map((t) => ({ kind: "task" as const, id: t.id, sub: `${t.packageId} · ${t.status}` }));
    return [...robots, ...tasks].slice(0, 8);
  }, [q, engine, engine.tick]);
  return (
    <div className="relative w-full max-w-[320px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search robots, tasks, packages…"
        className="h-10 w-full rounded-full border bg-card pl-9 pr-4 text-[13px] outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border bg-popover p-1 shadow-float">
          {results.map((r) => (
            <button
              key={r.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                setQ("");
                if (r.kind === "robot") {
                  select(r.id);
                  navigate({ to: "/" });
                } else navigate({ to: "/tasks" });
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-secondary"
            >
              {r.kind === "robot" ? <Bot className="h-4 w-4 text-primary" /> : <ClipboardList className="h-4 w-4 text-violet" />}
              <div>
                <div className="text-[13px] font-semibold">{r.id}</div>
                <div className="text-[11px] text-muted-foreground">{r.sub}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SimClock() {
  const engine = useEngine();
  const d = engine.clock();
  const t = d.toISOString();
  return (
    <div className="hidden h-10 items-center gap-2 rounded-full border bg-card px-4 text-[12px] lg:flex">
      <span className="text-muted-foreground">Sim</span>
      <span className="font-mono font-medium">
        {t.slice(0, 10)} {t.slice(11, 19)}
      </span>
    </div>
  );
}

function LiveBadge() {
  const mode = useSim((s) => s.mode);
  const live = mode === "running";
  return (
    <div
      className={cn(
        "flex h-10 items-center gap-2 rounded-full px-4 text-[12px] font-semibold",
        live ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
      )}
    >
      <Circle className={cn("h-2 w-2 fill-current", live && "animate-pulse")} />
      {live ? "Live" : mode === "paused" ? "Paused" : "Stopped"}
    </div>
  );
}

function Notifications() {
  const engine = useEngine();
  const items = engine.events.filter((e) => e.type === "conflict" || e.type === "replan" || e.type === "wait").slice(0, 6);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative grid h-10 w-10 place-items-center rounded-full border bg-card hover:bg-secondary" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {items.length > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-2">
        <div className="px-2 py-1.5 text-[12px] font-semibold">Coordination alerts</div>
        {items.length === 0 && <div className="px-2 py-3 text-[12px] text-muted-foreground">No alerts</div>}
        {items.map((e) => (
          <div key={e.id} className="rounded-xl px-2 py-2 text-[12px] hover:bg-secondary">
            <div>{e.message}</div>
            <div className="text-[10px] text-muted-foreground">tick {e.tick}</div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function TopNav() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-5 backdrop-blur">
      <div className="md:hidden">
        <Logo />
      </div>
      <GlobalSearch />
      <Select defaultValue="a">
        <SelectTrigger className="hidden h-10 w-[200px] rounded-full bg-card text-[12px] sm:flex">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Warehouse A · Zone B</SelectItem>
          <SelectItem value="b">Warehouse A · Zone C</SelectItem>
          <SelectItem value="c">Warehouse B · Cold Store</SelectItem>
        </SelectContent>
      </Select>
      <div className="ml-auto flex items-center gap-2">
        <SimClock />
        <LiveBadge />
        <Notifications />
        <div className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-violet-soft text-[11px] font-bold text-violet">NA</div>
          <div className="hidden leading-tight xl:block">
            <div className="text-[12px] font-semibold">Noman Ahmed</div>
            <div className="text-[10px] text-muted-foreground">Fleet Manager</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex gap-1 overflow-x-auto border-b px-3 py-2 md:hidden">
      {NAV.map((n) => (
        <Link key={n.to} to={n.to} className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-[12px]", path === n.to ? "bg-primary text-primary-foreground" : "bg-card")}>
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    getEngine();
    startDriver();
  }, []);
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        <MobileNav />
        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
