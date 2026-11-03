import { create } from "zustand";
import { Engine } from "./engine";

export type SimMode = "stopped" | "running" | "paused";
export const SPEEDS = [0.5, 1, 2, 4] as const;
export const TICK_INTERVAL = 0.6; // real seconds per tick at 1x

let engine: Engine | null = null;
export function getEngine() {
  if (!engine) engine = new Engine();
  return engine;
}

interface SimState {
  version: number;
  mode: SimMode;
  speed: number;
  selectedId: string | null;
  bump: () => void;
  setMode: (m: SimMode) => void;
  setSpeed: (s: number) => void;
  select: (id: string | null) => void;
}

export const useSim = create<SimState>((set) => ({
  version: 0,
  mode: "running",
  speed: 1,
  selectedId: null,
  bump: () => set((s) => ({ version: s.version + 1 })),
  setMode: (mode) => set({ mode }),
  setSpeed: (speed) => set({ speed }),
  select: (selectedId) => set({ selectedId }),
}));

/** Subscribe to simulation ticks and return the engine. */
export function useEngine() {
  useSim((s) => s.version);
  return getEngine();
}

// Driver: one loop advances the simulation; alpha is the interpolation progress
// within the current tick, read by the 3D scene every frame.
export const driver = { alpha: 1, acc: 0, stepping: false, started: false };

export function stepOnce() {
  getEngine().step();
  driver.acc = 0;
  driver.alpha = 0;
  driver.stepping = true;
  useSim.getState().bump();
}

export function resetSim() {
  engine = new Engine();
  driver.acc = 0;
  driver.alpha = 1;
  driver.stepping = false;
  useSim.setState({ mode: "stopped", selectedId: null });
  useSim.getState().bump();
}

export function startDriver() {
  if (driver.started || typeof window === "undefined") return;
  driver.started = true;
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const { mode, speed } = useSim.getState();
    if (mode === "running") {
      driver.acc += dt * speed;
      let stepped = false;
      while (driver.acc >= TICK_INTERVAL) {
        driver.acc -= TICK_INTERVAL;
        getEngine().step();
        stepped = true;
      }
      driver.alpha = driver.acc / TICK_INTERVAL;
      if (stepped) useSim.getState().bump();
    } else if (driver.stepping) {
      driver.acc += dt * Math.max(speed, 1);
      driver.alpha = Math.min(1, driver.acc / TICK_INTERVAL);
      if (driver.alpha >= 1) driver.stepping = false;
    } else {
      driver.alpha = 1;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
