import { create } from "zustand";

export type CameraCmd = "reset" | "top" | "zoomIn" | "zoomOut" | "follow";
export const useCamera = create<{ cmd: CameraCmd | null; n: number; send: (c: CameraCmd) => void }>((set) => ({
  cmd: null,
  n: 0,
  send: (cmd) => set((s) => ({ cmd, n: s.n + 1 })),
}));
