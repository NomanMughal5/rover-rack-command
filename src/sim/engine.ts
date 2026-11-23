// Pure TypeScript warehouse simulation. No React / three.js imports.
// Real multi-agent Space-Time A* pathfinding, centralized spatio-temporal reservation table,
// vertex and edge-swap conflict detection, prioritized greedy task allocation, and dynamic replanning.

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
  moving: boolean;
  battery: number;
  path: Cell[];
  route: Cell[];
  goal: Cell | null;
  home: Cell;
  taskId: string | null;
  packageId: string | null;
  distance: number;
  completed: number;
  waitTicks: number;
  totalWait: number;
  stuckTicks: number; // consecutive ticks with empty path while moving
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
  robotId?: string | undefined;
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

export const TICK_SECONDS = 4;
export const SIM_START = Date.UTC(2026, 10, 3, 8, 0, 0);

const PRIORITY_RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

// Max ticks to stay stuck before forcing replan/abort
const MAX_STUCK_TICKS = 6;
// Terminal stay at a destination (ticks). Keep small so we don't lock the grid.
const TERMINAL_BUFFER = 20;
// Idle robots reserve only a short rolling window so moving robots can path around them.
const IDLE_RESERVE_WINDOW = 15;

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
export const stKey = (x: number, y: number, t: number) => `${x},${y}@${t}`;
export const edgeKey = (fx: number, fy: number, tx: number, ty: number, t: number) => `${fx},${fy}->${tx},${ty}@${t}`;
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

// =========================================================================
// Centralized Spatio-Temporal Reservation Ledger (MAPF Invariant Enforcement)
// =========================================================================

export class ReservationTable {
  // (x, y, t) -> robotId
  vertexMap = new Map<string, string>();
  // (fx, fy -> tx, ty @ t) -> robotId
  edgeMap = new Map<string, string>();
  // robotId -> array of vertex keys
  robotVertices = new Map<string, string[]>();
  // robotId -> array of edge keys
  robotEdges = new Map<string, string[]>();

  isVertexReserved(x: number, y: number, t: number, ignoreRobotId?: string): boolean {
    const owner = this.vertexMap.get(stKey(x, y, t));
    return owner !== undefined && owner !== ignoreRobotId;
  }

  isEdgeReserved(fx: number, fy: number, tx: number, ty: number, t: number, ignoreRobotId?: string): boolean {
    // Edge-swap conflict check: reverse edge traversal
    const reverse = edgeKey(tx, ty, fx, fy, t);
    const owner = this.edgeMap.get(reverse);
    return owner !== undefined && owner !== ignoreRobotId;
  }

  commitRoute(robotId: string, route: Cell[], startTick: number, terminalStayTicks = TERMINAL_BUFFER) {
    this.releaseRoute(robotId);

    const vKeys: string[] = [];
    const eKeys: string[] = [];

    for (let i = 0; i < route.length; i++) {
      const step = route[i];
      const t = startTick + i;
      const vk = stKey(step.x, step.y, t);
      this.vertexMap.set(vk, robotId);
      vKeys.push(vk);

      if (i > 0) {
        const prev = route[i - 1];
        const ek = edgeKey(prev.x, prev.y, step.x, step.y, t - 1);
        this.edgeMap.set(ek, robotId);
        eKeys.push(ek);
      }
    }

    // Terminal stay buffer — short so it doesn't permanently block corridors
    if (route.length > 0 && terminalStayTicks > 0) {
      const end = route[route.length - 1];
      const endTick = startTick + route.length - 1;
      for (let t = endTick + 1; t <= endTick + terminalStayTicks; t++) {
        const vk = stKey(end.x, end.y, t);
        this.vertexMap.set(vk, robotId);
        vKeys.push(vk);
      }
    }

    this.robotVertices.set(robotId, vKeys);
    this.robotEdges.set(robotId, eKeys);
  }

  reserveStationaryStay(robotId: string, x: number, y: number, fromTick: number, durationTicks: number) {
    // Only add incremental ticks — don't wipe the whole route reservation.
    // This avoids overwriting per-route bookings with stationary stay registrations.
    let list = this.robotVertices.get(robotId);
    if (!list) {
      list = [];
      this.robotVertices.set(robotId, list);
    }
    for (let t = fromTick; t <= fromTick + durationTicks; t++) {
      const vk = stKey(x, y, t);
      if (!this.vertexMap.has(vk)) {
        this.vertexMap.set(vk, robotId);
        list.push(vk);
      }
    }
  }

  releaseRoute(robotId: string) {
    const vKeys = this.robotVertices.get(robotId);
    if (vKeys) {
      for (const vk of vKeys) {
        if (this.vertexMap.get(vk) === robotId) this.vertexMap.delete(vk);
      }
      this.robotVertices.delete(robotId);
    }
    const eKeys = this.robotEdges.get(robotId);
    if (eKeys) {
      for (const ek of eKeys) {
        if (this.edgeMap.get(ek) === robotId) this.edgeMap.delete(ek);
      }
      this.robotEdges.delete(robotId);
    }
  }

  purgeExpired(currentTick: number) {
    for (const [vk] of this.vertexMap) {
      const atIndex = vk.indexOf("@");
      if (atIndex !== -1) {
        const t = Number(vk.substring(atIndex + 1));
        if (t < currentTick) this.vertexMap.delete(vk);
      }
    }
    for (const [ek] of this.edgeMap) {
      const atIndex = ek.indexOf("@");
      if (atIndex !== -1) {
        const t = Number(ek.substring(atIndex + 1));
        if (t < currentTick) this.edgeMap.delete(ek);
      }
    }
  }

  getAllUpcoming(currentTick: number, maxHorizon = 12): Reservation[] {
    const result: Reservation[] = [];
    for (const [vk, robotId] of this.vertexMap) {
      const atIndex = vk.indexOf("@");
      if (atIndex !== -1) {
        const t = Number(vk.substring(atIndex + 1));
        if (t > currentTick && t <= currentTick + maxHorizon) {
          const [coords] = vk.split("@");
          const [x, y] = coords.split(",").map(Number);
          result.push({ cell: { x, y }, t, robotId });
        }
      }
    }
    return result;
  }
}

// =========================================================================
// 3D Space-Time A* Multi-Agent Pathfinding Solver (x, y, t)
// =========================================================================

interface STNode {
  x: number;
  y: number;
  t: number;
  g: number;
  h: number;
  parent: STNode | null;
}

export function spaceTimeAStar(
  W: number,
  H: number,
  blocked: boolean[][],
  start: Cell,
  goal: Cell,
  startTime: number,
  table: ReservationTable,
  robotId: string,
  maxHorizon = 150,
): Cell[] | null {
  if (start.x === goal.x && start.y === goal.y) return [{ x: start.x, y: start.y }];

  const open = new MinHeap<STNode>();
  const gScores = new Map<string, number>();
  const closed = new Set<string>();

  const startNode: STNode = {
    x: start.x,
    y: start.y,
    t: startTime,
    g: 0,
    h: manhattan(start, goal),
    parent: null,
  };

  const startK = stKey(start.x, start.y, startTime);
  gScores.set(startK, 0);
  open.push(startNode, startNode.h);

  const maxTime = startTime + maxHorizon;
  const dirs = [
    [0, -1], // North
    [0, 1],  // South
    [1, 0],  // East
    [-1, 0], // West
  ];

  while (open.size > 0) {
    const cur = open.pop()!;
    const curK = stKey(cur.x, cur.y, cur.t);

    if (closed.has(curK)) continue;
    closed.add(curK);

    if (cur.x === goal.x && cur.y === goal.y) {
      const path: Cell[] = [];
      let n: STNode | null = cur;
      while (n) {
        path.push({ x: n.x, y: n.y });
        n = n.parent;
      }
      return path.reverse();
    }

    if (cur.t >= maxTime) continue;

    const nextT = cur.t + 1;
    const tentativeG = cur.g + 1;

    // 1. Cardinal neighbor transitions
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;

      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (blocked[ny][nx]) continue;

      if (table.isVertexReserved(nx, ny, nextT, robotId)) continue;
      if (table.isEdgeReserved(cur.x, cur.y, nx, ny, cur.t, robotId)) continue;

      const nextK = stKey(nx, ny, nextT);
      if (closed.has(nextK)) continue;

      const bestG = gScores.get(nextK) ?? Infinity;
      if (tentativeG < bestG) {
        gScores.set(nextK, tentativeG);
        const nextNode: STNode = {
          x: nx,
          y: ny,
          t: nextT,
          g: tentativeG,
          h: manhattan({ x: nx, y: ny }, goal),
          parent: cur,
        };
        open.push(nextNode, tentativeG + nextNode.h);
      }
    }

    // 2. In-place wait action
    if (!table.isVertexReserved(cur.x, cur.y, nextT, robotId)) {
      const waitK = stKey(cur.x, cur.y, nextT);
      if (!closed.has(waitK)) {
        const bestG = gScores.get(waitK) ?? Infinity;
        if (tentativeG < bestG) {
          gScores.set(waitK, tentativeG);
          const waitNode: STNode = {
            x: cur.x,
            y: cur.y,
            t: nextT,
            g: tentativeG,
            h: manhattan({ x: cur.x, y: cur.y }, goal),
            parent: cur,
          };
          open.push(waitNode, tentativeG + waitNode.h);
        }
      }
    }
  }

  return null;
}

/** Legacy 2D A* over 4-connected grid (fallback when Space-Time horizon exhausted). */
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

export const MODELS = ["Pallet Carrier P2", "Shelf Lifter S4", "Tote Runner T1", "Heavy Loader H8"];
export const NAMES = ["Atlas", "Bolt", "Cargo", "Dash", "Echo", "Flux", "Gizmo", "Hauler"];

// =========================================================================
// Main Warehouse Simulation Engine Orchestrator
// =========================================================================

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

  public reservationTable = new ReservationTable();

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
    this.log("system", "Simulation initialised — 8 AMRs online with Space-Time A* and Reservation Table");
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
    this.block(0, 17, this.W, 1);
    [3, 8, 15, 20].forEach((x, i) => {
      this.locations.push({ id: `D${i + 1}`, label: `Dock ${i + 1}`, kind: "delivery", cell: { x: x + 1, y: 16 } });
    });
    this.restricted.push({ x: 11, y: 14, w: 3, h: 2 });
    this.block(11, 14, 3, 2);
    this.obstacles = [
      { x: 0, y: 9 },
      { x: 25, y: 5 },
      { x: 7, y: 14 },
      { x: 18, y: 14 },
    ];
    this.obstacles.forEach((o) => (this.blocked[o.y][o.x] = true));
  }

  private spawnRobots() {
    // Spread robots across the top row with more spacing to reduce startup congestion
    for (let i = 0; i < 8; i++) {
      const home = { x: 1 + i * 3, y: 1 };  // y=1 avoids blocked y=0 edge-cases; spacing=3
      const robot: Robot = {
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
        stuckTicks: 0,
        dwell: 0,
        busyTicks: 0,
        blockedBy: null,
      };
      this.robots.push(robot);
      // Short rolling reservation — avoids permanently locking corridors
      this.reservationTable.reserveStationaryStay(robot.id, home.x, home.y, 0, IDLE_RESERVE_WINDOW);
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
    this.log("task", `${t.id} created [${t.priority.toUpperCase()}]: ${t.pickup} → ${t.delivery} (${t.packageId})`);
    return t;
  }

  /**
   * Plans a conflict-free Space-Time A* path, with 2D A* fallback.
   * Returns true if a path was found.
   */
  plan(r: Robot, goal: Cell): boolean {
    // Release previous reservations so they don't self-block
    this.reservationTable.releaseRoute(r.id);

    let stPath = spaceTimeAStar(
      this.W,
      this.H,
      this.blocked,
      { x: r.x, y: r.y },
      goal,
      this.tick,
      this.reservationTable,
      r.id,
      150,
    );

    // Fallback to 2D A* if space-time horizon exhausted
    if (!stPath || stPath.length <= 1) {
      const fallback2D = aStar(this.W, this.H, this.blocked, { x: r.x, y: r.y }, goal);
      if (fallback2D && fallback2D.length > 0) {
        stPath = [{ x: r.x, y: r.y }, ...fallback2D];
      }
    }

    if (stPath && stPath.length > 0) {
      this.reservationTable.commitRoute(r.id, stPath, this.tick, TERMINAL_BUFFER);
      r.route = [...stPath];
      r.path = stPath.slice(1);
      r.goal = goal;
      r.stuckTicks = 0;
      return true;
    } else {
      // No path found — hold position briefly
      r.path = [];
      r.route = [{ x: r.x, y: r.y }];
      r.goal = goal;
      this.reservationTable.reserveStationaryStay(r.id, r.x, r.y, this.tick, 3);
      return false;
    }
  }

  /**
   * Greedy Task Allocation: Priority-Ranked Queue + Manhattan Distance Evaluation.
   */
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
      r.stuckTicks = 0;

      this.plan(r, pc);
      this.log("assign", `${r.id} assigned ${t.id} (${manhattan(r, pc)} cells to ${t.pickup})`, r.id);
      assigned++;
    }
    return assigned;
  }

  /**
   * Advances the simulation clock by 1 discrete tick.
   */
  step() {
    this.tick++;

    // Periodic auto-generation
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

    // ── Phase 1: Dwell handling (loading at pickup / unloading at delivery) ──
    for (const r of this.robots) {
      if (r.status === "loading" || r.status === "unloading") {
        r.dwell--;
        this.reservationTable.reserveStationaryStay(r.id, r.x, r.y, this.tick, 4);

        if (r.dwell > 0) continue;

        const t = this.task(r.taskId);
        if (!t) continue;

        if (r.status === "loading") {
          r.packageId = t.packageId;
          t.status = "in_progress";
          r.status = "to_delivery";
          r.moving = true;
          r.stuckTicks = 0;
          this.log("pickup", `${r.id} loaded ${t.packageId} at ${t.pickup}`, r.id);
          this.plan(r, this.loc(t.delivery).cell);
        } else {
          t.status = "completed";
          t.completedTick = this.tick;
          r.completed++;
          this.log("deliver", `${r.id} delivered ${r.packageId} to ${t.delivery}`, r.id);
          r.packageId = null;
          r.taskId = null;
          r.status = "returning";
          r.moving = true;
          r.stuckTicks = 0;
          this.plan(r, r.home);
        }
      }
    }

    // ── Phase 2: Physical kinematics with Space-Time safety guard ──
    const movers = this.robots.filter((r) => r.moving && r.path.length > 0);

    for (const r of movers) {
      const next = r.path[0];

      // Physical guard: is another robot physically standing at next?
      let blocker: Robot | null = null;
      for (const other of this.robots) {
        if (other.id !== r.id && other.x === next.x && other.y === next.y) {
          blocker = other;
          break;
        }
      }

      if (blocker) {
        r.waitTicks++;
        r.totalWait++;
        r.stuckTicks++;
        this.blockedMoves++;
        r.blockedBy = blocker.id;

        const isSwap =
          blocker.moving &&
          blocker.path.length > 0 &&
          blocker.path[0].x === r.x &&
          blocker.path[0].y === r.y;

        if (isSwap) {
          this.swapConflicts++;
          this.addConflict("swap", [r.id, blocker.id], next);
        } else {
          this.addConflict("vertex", [r.id, blocker.id], next);
        }

        this.log("wait", `${r.id} yielded cell (${next.x},${next.y}) held by ${blocker.id}`, r.id);

        // Dynamic replan
        if (r.goal) {
          const ok = this.plan(r, r.goal);
          this.replans++;
          if (ok) {
            this.log("replan", `${r.id} recomputed space-time route (${r.path.length} cells)`, r.id);
          }
        }
        continue;
      }

      // Execute step
      const nextStep = r.path.shift()!;
      r.heading = Math.atan2(nextStep.x - r.x, nextStep.y - r.y);
      r.x = nextStep.x;
      r.y = nextStep.y;
      r.distance++;
      r.battery = Math.max(5, r.battery - (r.packageId ? 0.18 : 0.1));
      r.busyTicks++;
      r.stuckTicks = 0;

      if (r.waitTicks > 0) this.resolveConflictsFor(r.id);
      r.waitTicks = 0;
    }

    // ── Phase 3: Handle robots that are moving but have empty path ──
    // (Either arrived at goal, or stuck with no path found)
    for (const r of this.robots) {
      if (!r.moving) continue;

      if (r.path.length === 0) {
        // Check if we're at goal
        if (r.goal && r.x === r.goal.x && r.y === r.goal.y) {
          // Arrived!
          if (r.status === "to_pickup") {
            r.status = "loading";
            r.moving = false;
            r.dwell = 2;
            r.stuckTicks = 0;
            this.reservationTable.reserveStationaryStay(r.id, r.x, r.y, this.tick, 4);
          } else if (r.status === "to_delivery") {
            r.status = "unloading";
            r.moving = false;
            r.dwell = 2;
            r.stuckTicks = 0;
            this.reservationTable.reserveStationaryStay(r.id, r.x, r.y, this.tick, 4);
          } else if (r.status === "returning") {
            r.status = "idle";
            r.moving = false;
            r.route = [];
            r.goal = null;
            r.stuckTicks = 0;
            // Short rolling idle reservation
            this.reservationTable.reserveStationaryStay(r.id, r.x, r.y, this.tick, IDLE_RESERVE_WINDOW);
          }
        } else if (r.goal) {
          // Not at goal but path is empty — stuck or no path found
          r.stuckTicks++;

          if (r.stuckTicks >= MAX_STUCK_TICKS) {
            // Force replan
            const ok = this.plan(r, r.goal);
            this.replans++;
            if (ok) {
              this.log("replan", `${r.id} force-replan after ${r.stuckTicks} stuck ticks`, r.id);
              r.stuckTicks = 0;
            } else if (r.stuckTicks > MAX_STUCK_TICKS * 3) {
              // Complete deadlock — abort task and return home
              this._abortRobotTask(r);
            }
          }
        }
      }
    }

    // ── Phase 4: Arrival check for robots that just moved into goal ──
    // (handle edge case where path was [one step] and was consumed above)
    for (const r of this.robots) {
      if (r.moving && r.path.length === 0 && !r.goal) {
        r.moving = false;
      }
    }

    // ── Phase 5: Idle recharge + rolling reservation refresh ──
    for (const r of this.robots) {
      if (r.status === "idle") {
        r.battery = Math.min(100, r.battery + 0.6);
        // Rolling short window — prevents permanently blocking corridors
        this.reservationTable.reserveStationaryStay(r.id, r.x, r.y, this.tick, IDLE_RESERVE_WINDOW);
      }
    }

    // ── Phase 6: Purge expired reservations, sync UI reservations array ──
    this.reservationTable.purgeExpired(this.tick);
    this.computeReservations();

    // ── Phase 7: History ──
    const done = this.tasks.filter((t) => t.status === "completed").length;
    this.history.push({
      tick: this.tick,
      completed: done,
      active: this.robots.filter((r) => r.status !== "idle").length,
      waiting: this.robots.filter((r) => r.waitTicks > 0).length,
    });
    if (this.history.length > 240) this.history.shift();
  }

  /** Aborts the current task for a deadlocked robot and replans a return home. */
  private _abortRobotTask(r: Robot) {
    if (r.taskId) {
      const t = this.task(r.taskId);
      if (t) {
        t.status = "pending";
        t.robotId = null;
      }
    }
    r.taskId = null;
    r.packageId = null;
    r.status = "returning";
    r.stuckTicks = 0;
    this.log("replan", `${r.id} aborted task due to deadlock — returning home`, r.id);
    this.plan(r, r.home);
  }

  private addConflict(kind: Conflict["kind"], robots: string[], cell: Cell) {
    this.conflicts.unshift({ id: this.conflictSeq++, tick: this.tick, kind, robots, cell: { ...cell }, resolved: kind === "swap" });
    if (kind === "swap") this.log("conflict", `${robots[0]} ↔ ${robots[1]} opposite-direction conflict at (${cell.x},${cell.y})`, robots[0]);
    if (this.conflicts.length > 150) this.conflicts.length = 150;
  }

  private resolveConflictsFor(id: string) {
    for (const c of this.conflicts) if (!c.resolved && c.robots[0] === id) c.resolved = true;
  }

  computeReservations() {
    this.reservations = this.reservationTable.getAllUpcoming(this.tick, 8);
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
