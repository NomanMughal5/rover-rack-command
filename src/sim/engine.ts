// Pure TypeScript warehouse simulation. No React / three.js imports.
// Mirrors the planned Java backend: grid graph, A* (binary-heap priority queue),
// greedy task allocation, time-indexed reservation table and collision handling.

export type Cell = { x: number; y: number };
export type RobotStatus =
  | "idle"
  | "returning"
  | "to_pickup"
  | "loading"
  | "to_delivery"
  | "unloading"
  | "waiting";
export type TaskStatus = "pending" | "assigned" | "in_progress" | "completed";
export type Priority = "low" | "normal" | "high";

export interface Location {
  id: string;
  label: string;
  kind: "pickup" | "delivery";
  cell: Cell;
}

export interface Rack {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: "orange" | "green" | "mixed";
}

export interface Robot {
  id: string;
  name: string;
  model: string;
  x: number;
  y: number;
  px: number;
  py: number;
  heading: number;
  status: RobotStatus;
  moving: boolean; // true when status is a travelling state
  battery: number;
  path: Cell[];
  route: Cell[]; // full planned route of current leg (for display)
  goal: Cell | null;
  home: Cell;
  taskId: string | null;
  packageId: string | null;
  distance: number;
  completed: number;
  waitTicks: number;
  totalWait: number;
  dwell: number;
  busyTicks: number;
  blockedBy: string | null;
}

export interface Task {
  id: string;
  pickup: string;
  delivery: string;
  packageId: string;
  priority: Priority;
  status: TaskStatus;
  robotId: string | null;
  createdTick: number;
  completedTick: number | null;
}

export type EventType = "assign" | "pickup" | "deliver" | "conflict" | "wait" | "replan" | "task" | "system";
export interface SimEvent {
  id: number;
  tick: number;
  type: EventType;
  robotId?: string;
  message: string;
}

export interface Conflict {
  id: number;
  tick: number;
  kind: "vertex" | "swap" | "blocked";
  robots: string[];
  cell: Cell;
  resolved: boolean;
}

export interface Reservation {
  cell: Cell;
  t: number;
  robotId: string;
}

export interface HistoryPoint {
  tick: number;
  completed: number;
  active: number;
  waiting: number;
}

export const TICK_SECONDS = 4; // simulated seconds per tick (for clock display)
export const SIM_START = Date.UTC(2026, 10, 3, 8, 0, 0);

const PRIORITY_RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const key = (c: Cell) => `${c.x},${c.y}`;
export const manhattan = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Min-heap priority queue (equivalent of java.util.PriorityQueue). */
export class MinHeap<T> {
  private items: { p: number; v: T }[] = [];
  get size() {
    return this.items.length;
  }
  push(v: T, p: number) {
    const a = this.items;
    a.push({ p, v });
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent].p <= a[i].p) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }
  pop(): T | undefined {
    const a = this.items;
    if (!a.length) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].p < a[m].p) m = l;
        if (r < a.length && a[r].p < a[m].p) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top.v;
  }
}

/** A* over a 4-connected grid. Returns the path excluding the start cell, or null. */
export function aStar(
  W: number,
  H: number,
  blocked: boolean[][],
  start: Cell,
  goal: Cell,
  extra?: Set<string>,
): Cell[] | null {
  if (start.x === goal.x && start.y === goal.y) return [];
  const open = new MinHeap<Cell>();
  const g = new Map<string, number>();
  const came = new Map<string, string>();
  const closed = new Set<string>();
  const sk = key(start);
  g.set(sk, 0);
  open.push(start, manhattan(start, goal));
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (open.size) {
    const cur = open.pop()!;
    const ck = key(cur);
    if (closed.has(ck)) continue;
    if (cur.x === goal.x && cur.y === goal.y) {
      const path: Cell[] = [];
      let k: string | undefined = ck;
      while (k && k !== sk) {
        const [x, y] = k.split(",").map(Number);
        path.push({ x, y });
        k = came.get(k);
      }
      return path.reverse();
    }
    closed.add(ck);
    for (const [dx, dy] of dirs) {
      const n = { x: cur.x + dx, y: cur.y + dy };
      if (n.x < 0 || n.y < 0 || n.x >= W || n.y >= H) continue;
      if (blocked[n.y][n.x]) continue;
      const nk = key(n);
      if (closed.has(nk)) continue;
      if (extra?.has(nk) && !(n.x === goal.x && n.y === goal.y)) continue;
      const ng = g.get(ck)! + 1;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        came.set(nk, ck);
        open.push(n, ng + manhattan(n, goal));
      }
    }
  }
  return null;
}

const MODELS = ["Pallet Carrier P2", "Shelf Lifter S4", "Tote Runner T1", "Heavy Loader H8"];
const NAMES = ["Atlas", "Bolt", "Cargo", "Dash", "Echo", "Flux", "Gizmo", "Hauler"];

export class Engine {
  readonly W = 26;
  readonly H = 18;
  blocked: boolean[][];
  racks: Rack[] = [];
  restricted: { x: number; y: number; w: number; h: number }[] = [];
  obstacles: Cell[] = [];
  locations: Location[] = [];
  robots: Robot[] = [];
  tasks: Task[] = [];
  events: SimEvent[] = [];
  conflicts: Conflict[] = [];
  reservations: Reservation[] = [];
  history: HistoryPoint[] = [];
  tick = 0;
  replans = 0;
  blockedMoves = 0;
  swapConflicts = 0;
  autoGenerate = true;
  private taskSeq = 1;
  private pkgSeq = 1;
  private eventSeq = 1;
  private conflictSeq = 1;
  private rng: () => number;

  constructor(seed = 7) {
    this.rng = mulberry32(seed);
    this.blocked = Array.from({ length: this.H }, () => Array(this.W).fill(false));
    this.buildLayout();
    this.spawnRobots();
    for (let i = 0; i < 6; i++) this.createTask();
    this.allocate();
    this.computeReservations();
    this.log("system", "Simulation initialised — 8 AMRs online, 6 tasks queued");
  }

  private block(x: number, y: number, w: number, h: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.blocked[j][i] = true;
  }

  private buildLayout() {
    const cols = [2, 8, 14, 20];
    const rows = [3, 7, 11];
    let n = 1;
    rows.forEach((ry, ri) => {
      cols.forEach((cx, ci) => {
        const color: Rack["color"] = ri === 0 ? "orange" : ri === 1 ? "green" : ci % 2 ? "mixed" : "green";
        this.racks.push({ id: `R${n}`, x: cx, y: ry, w: 4, h: 2, color });
        this.block(cx, ry, 4, 2);
        this.locations.push({
          id: `P${n}`,
          label: `Rack ${n} · Bay ${String.fromCharCode(65 + ri)}`,
          kind: "pickup",
          cell: { x: cx + 1 + (n % 2), y: ry + 2 },
        });
        n++;
      });
    });
    // loading dock wall + trucks
    this.block(0, 17, this.W, 1);
    [3, 8, 15, 20].forEach((x, i) => {
      this.locations.push({ id: `D${i + 1}`, label: `Dock ${i + 1}`, kind: "delivery", cell: { x: x + 1, y: 16 } });
    });
    // restricted maintenance zone
    this.restricted.push({ x: 11, y: 14, w: 3, h: 2 });
    this.block(11, 14, 3, 2);
    // pallet obstacles
    this.obstacles = [
      { x: 0, y: 9 },
      { x: 25, y: 5 },
      { x: 7, y: 14 },
      { x: 18, y: 14 },
    ];
    this.obstacles.forEach((o) => (this.blocked[o.y][o.x] = true));
  }

  private spawnRobots() {
    for (let i = 0; i < 8; i++) {
      const home = { x: 2 + i * 3, y: 0 };
      this.robots.push({
        id: `AMR-${String(i + 1).padStart(3, "0")}`,
        name: NAMES[i],
        model: MODELS[i % MODELS.length],
        x: home.x,
        y: home.y,
        px: home.x,
        py: home.y,
        heading: 0,
        status: "idle",
        moving: false,
        battery: 62 + Math.round(this.rng() * 36),
        path: [],
        route: [],
        goal: null,
        home,
        taskId: null,
        packageId: null,
        distance: 0,
        completed: 0,
        waitTicks: 0,
        totalWait: 0,
        dwell: 0,
        busyTicks: 0,
        blockedBy: null,
      });
    }
  }

  loc(id: string) {
    return this.locations.find((l) => l.id === id)!;
  }
  robot(id: string | null | undefined) {
    return this.robots.find((r) => r.id === id);
  }
  task(id: string | null | undefined) {
    return this.tasks.find((t) => t.id === id);
  }

  nextTaskId() {
    return `TASK-${String(this.taskSeq).padStart(3, "0")}`;
  }
  nextPackageId() {
    return `PKG-${String(this.pkgSeq).padStart(3, "0")}`;
  }

  log(type: EventType, message: string, robotId?: string) {
    this.events.unshift({ id: this.eventSeq++, tick: this.tick, type, robotId, message });
    if (this.events.length > 200) this.events.length = 200;
  }

  createTask(input?: { pickup?: string | undefined; delivery?: string | undefined; packageId?: string | undefined; priority?: Priority | undefined }) {
    const pickups = this.locations.filter((l) => l.kind === "pickup");
    const docks = this.locations.filter((l) => l.kind === "delivery");
    const pr: Priority[] = ["normal", "normal", "high", "low"];
    const t: Task = {
      id: this.nextTaskId(),
      pickup: input?.pickup ?? pickups[Math.floor(this.rng() * pickups.length)].id,
      delivery: input?.delivery ?? docks[Math.floor(this.rng() * docks.length)].id,
      packageId: input?.packageId || this.nextPackageId(),
      priority: input?.priority ?? pr[Math.floor(this.rng() * pr.length)],
      status: "pending",
      robotId: null,
      createdTick: this.tick,
      completedTick: null,
    };
    this.taskSeq++;
    if (!input?.packageId) this.pkgSeq++;
    this.tasks.unshift(t);
    this.log("task", `${t.id} created: ${t.pickup} → ${t.delivery} (${t.packageId})`);
    return t;
  }

  private obstaclesFor(r: Robot) {
    const s = new Set<string>();
    for (const o of this.robots) if (o !== r && !o.moving) s.add(key(o));
    return s;
  }

  private plan(r: Robot, goal: Cell, avoid?: Set<string>) {
    const extra = avoid ?? this.obstaclesFor(r);
    let p = aStar(this.W, this.H, this.blocked, r, goal, extra);
    if (!p) p = aStar(this.W, this.H, this.blocked, r, goal);
    r.path = p ?? [];
    r.route = [{ x: r.x, y: r.y }, ...r.path];
    r.goal = goal;
  }

  /** Greedy allocation: highest priority / oldest task gets the nearest available robot. */
  allocate() {
    const pending = this.tasks
      .filter((t) => t.status === "pending")
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.createdTick - b.createdTick);
    let assigned = 0;
    for (const t of pending) {
      const free = this.robots.filter(
        (r) => (r.status === "idle" || r.status === "returning") && !r.taskId && r.battery > 18,
      );
      if (!free.length) break;
      const pc = this.loc(t.pickup).cell;
      free.sort((a, b) => manhattan(a, pc) - manhattan(b, pc));
      const r = free[0];
      t.status = "assigned";
      t.robotId = r.id;
      r.taskId = t.id;
      r.status = "to_pickup";
      r.moving = true;
      r.waitTicks = 0;
      this.plan(r, pc);
      this.log("assign", `${r.id} assigned ${t.id} (${manhattan(r, pc)} cells to ${t.pickup})`, r.id);
      assigned++;
    }
    return assigned;
  }

  step() {
    this.tick++;
    if (this.autoGenerate && this.tick % 7 === 0) {
      const open = this.tasks.filter((t) => t.status === "pending").length;
      if (open < 4) this.createTask();
    }
    this.allocate();

    for (const r of this.robots) {
      r.px = r.x;
      r.py = r.y;
      r.blockedBy = null;
    }

    // dwell handling
    for (const r of this.robots) {
      if (r.status === "loading" || r.status === "unloading") {
        r.dwell--;
        if (r.dwell > 0) continue;
        const t = this.task(r.taskId)!;
        if (r.status === "loading") {
          r.packageId = t.packageId;
          t.status = "in_progress";
          r.status = "to_delivery";
          r.moving = true;
          this.log("pickup", `${r.id} picked up ${t.packageId} at ${t.pickup}`, r.id);
          this.plan(r, this.loc(t.delivery).cell);
        } else {
          t.status = "completed";
          t.completedTick = this.tick;
          r.completed++;
          this.log("deliver", `${r.id} completed delivery of ${r.packageId} at ${t.delivery}`, r.id);
          r.packageId = null;
          r.taskId = null;
          r.status = "returning";
          r.moving = true;
          this.plan(r, r.home);
        }
      }
    }

    // movement resolution with collision handling
    const movers = this.robots
      .filter((r) => r.moving && r.path.length)
      .sort((a, b) => Number(!!b.packageId) - Number(!!a.packageId) || a.id.localeCompare(b.id));
    const claimed = new Map<string, string>();
    const at = new Map<string, Robot>();
    for (const r of this.robots) at.set(key(r), r);
    for (const r of this.robots) if (!movers.includes(r)) claimed.set(key(r), r.id);

    const decided = new Map<Robot, boolean>(); // true = move
    let progress = true;
    while (progress) {
      progress = false;
      for (const r of movers) {
        if (decided.has(r)) continue;
        const next = r.path[0];
        const nk = key(next);
        if (claimed.has(nk)) {
          decided.set(r, false);
          claimed.set(key(r), r.id);
          r.blockedBy = claimed.get(nk)!;
          progress = true;
          continue;
        }
        const occ = at.get(nk);
        if (occ && occ !== r && !decided.has(occ)) {
          const on = occ.path[0];
          if (on && on.x === r.x && on.y === r.y) {
            // opposite-direction swap conflict: lower-priority robot yields and replans
            this.swapConflicts++;
            const yielder = movers.indexOf(r) > movers.indexOf(occ) ? r : occ;
            const other = yielder === r ? occ : r;
            this.addConflict("swap", [r.id, occ.id], next);
            const avoid = this.obstaclesFor(yielder);
            avoid.add(key(other));
            this.plan(yielder, yielder.goal!, avoid);
            this.replans++;
            this.log("replan", `${yielder.id} replanned around ${other.id} (opposite-direction conflict)`, yielder.id);
            decided.set(yielder, false);
            claimed.set(key(yielder), yielder.id);
            yielder.blockedBy = other.id;
            progress = true;
          }
          continue; // wait for occupant to decide
        }
        decided.set(r, true);
        claimed.set(nk, r.id);
        progress = true;
      }
    }

    for (const r of movers) {
      const move = decided.get(r) === true;
      if (!move) {
        if (!decided.has(r)) claimed.set(key(r), r.id);
        r.waitTicks++;
        r.totalWait++;
        this.blockedMoves++;
        if (r.waitTicks === 1) {
          const by = r.blockedBy ? ` (cell held by ${r.blockedBy})` : "";
          this.addConflict("vertex", [r.id, r.blockedBy ?? "?"], r.path[0]);
          this.log("wait", `${r.id} waiting for cell (${r.path[0].x},${r.path[0].y})${by}`, r.id);
        }
        if (r.waitTicks >= 3 && r.goal) {
          const avoid = this.obstaclesFor(r);
          avoid.add(key(r.path[0]));
          this.plan(r, r.goal, avoid);
          this.replans++;
          r.waitTicks = 0;
          this.log("replan", `${r.id} recomputed A* route (${r.path.length} cells)`, r.id);
        }
        continue;
      }
      const next = r.path.shift()!;
      r.heading = Math.atan2(next.x - r.x, next.y - r.y);
      r.x = next.x;
      r.y = next.y;
      r.distance++;
      r.battery = Math.max(5, r.battery - (r.packageId ? 0.18 : 0.1));
      r.busyTicks++;
      if (r.waitTicks > 0) this.resolveConflictsFor(r.id);
      r.waitTicks = 0;
    }

    // arrivals
    for (const r of this.robots) {
      if (!r.moving || r.path.length) continue;
      if (r.status === "to_pickup") {
        r.status = "loading";
        r.moving = false;
        r.dwell = 2;
      } else if (r.status === "to_delivery") {
        r.status = "unloading";
        r.moving = false;
        r.dwell = 2;
      } else if (r.status === "returning") {
        if (r.x === r.home.x && r.y === r.home.y) {
          r.status = "idle";
          r.moving = false;
          r.route = [];
          r.goal = null;
        } else this.plan(r, r.home);
      }
    }
    for (const r of this.robots) {
      if (r.status === "idle") r.battery = Math.min(100, r.battery + 0.6);
      if (r.moving && r.waitTicks > 0) r.status = r.status; // status retained; waiting shown via waitTicks
    }

    this.computeReservations();
    const done = this.tasks.filter((t) => t.status === "completed").length;
    this.history.push({
      tick: this.tick,
      completed: done,
      active: this.robots.filter((r) => r.status !== "idle").length,
      waiting: this.robots.filter((r) => r.waitTicks > 0).length,
    });
    if (this.history.length > 240) this.history.shift();
  }

  private addConflict(kind: Conflict["kind"], robots: string[], cell: Cell) {
    this.conflicts.unshift({ id: this.conflictSeq++, tick: this.tick, kind, robots, cell: { ...cell }, resolved: kind === "swap" });
    if (kind === "swap") this.log("conflict", `${robots[0]} ↔ ${robots[1]} opposite-direction conflict at (${cell.x},${cell.y})`, robots[0]);
    if (this.conflicts.length > 150) this.conflicts.length = 150;
  }

  private resolveConflictsFor(id: string) {
    for (const c of this.conflicts) if (!c.resolved && c.robots[0] === id) c.resolved = true;
  }

  /** Time-based reservation table: each moving robot reserves its next cells for t+1..t+5. */
  computeReservations() {
    const res: Reservation[] = [];
    for (const r of this.robots) {
      res.push({ cell: { x: r.x, y: r.y }, t: this.tick, robotId: r.id });
      r.path.slice(0, 5).forEach((c, i) => res.push({ cell: c, t: this.tick + i + 1, robotId: r.id }));
    }
    this.reservations = res;
  }

  isWaiting(r: Robot) {
    return r.moving && r.waitTicks > 0;
  }

  displayStatus(r: Robot): string {
    if (this.isWaiting(r)) return "Waiting";
    return {
      idle: "Idle",
      returning: "Returning",
      to_pickup: "To pickup",
      loading: "Loading",
      to_delivery: "Delivering",
      unloading: "Unloading",
      waiting: "Waiting",
    }[r.status];
  }

  clock() {
    return new Date(SIM_START + this.tick * TICK_SECONDS * 1000);
  }
}
