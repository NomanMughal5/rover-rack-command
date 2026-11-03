import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Maximize2, Minus, Plus, RotateCcw, ScanSearch } from "lucide-react";
import { useCamera } from "./camera";

const Scene = lazy(() => import("./WarehouseScene"));
export const LazyRobotPreview = lazy(() => import("./RobotPreview"));

function Loading() {
  return (
    <div className="grid h-full w-full place-items-center text-[12px] text-muted-foreground">Loading 3D warehouse…</div>
  );
}

function CamButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full border bg-card/90 text-foreground shadow-card backdrop-blur transition hover:bg-card hover:text-primary"
    >
      {children}
    </button>
  );
}

export function WarehouseView() {
  const send = useCamera((s) => s.send);
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border bg-[color:var(--background)]">
      <ClientOnly fallback={<Loading />}>
        <Suspense fallback={<Loading />}>
          <div className="absolute inset-0">
            <Scene />
          </div>
        </Suspense>
      </ClientOnly>
      <div className="absolute right-4 top-4 flex gap-2">
        <CamButton label="Reset camera" onClick={() => send("reset")}>
          <RotateCcw className="h-4 w-4" />
        </CamButton>
        <CamButton label="Top view" onClick={() => send("top")}>
          <ScanSearch className="h-4 w-4" />
        </CamButton>
        <CamButton label="Zoom in" onClick={() => send("zoomIn")}>
          <Plus className="h-4 w-4" />
        </CamButton>
        <CamButton label="Zoom out" onClick={() => send("zoomOut")}>
          <Minus className="h-4 w-4" />
        </CamButton>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap gap-2 text-[10px] font-medium">
        {[
          ["bg-success", "Available route"],
          ["bg-primary", "Assigned route"],
          ["bg-destructive", "Blocked / conflict"],
          ["bg-violet", "Loading"],
        ].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5 rounded-full border bg-card/90 px-2.5 py-1 backdrop-blur">
            <span className={`h-2 w-2 rounded-full ${c}`} />
            {l}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 hidden items-center gap-1.5 rounded-full border bg-card/90 px-2.5 py-1 text-[10px] text-muted-foreground lg:flex">
        <Maximize2 className="h-3 w-3" /> Drag to rotate · Right-drag to pan · Scroll to zoom · Click a robot
      </div>
    </div>
  );
}
