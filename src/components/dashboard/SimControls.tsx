import { FastForward, Pause, Play, PlusCircle, RotateCcw, StepForward, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";
import { getEngine, pauseSim, resetSim, SPEEDS, stepOnce, useSim } from "@/sim/store";
import { AddTaskDialog } from "./AddTaskDialog";
import { cn } from "@/lib/utils";

function Btn({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
        primary ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90" : "bg-card hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

export function SimControls() {
  const { mode, speed, setMode, setSpeed, bump } = useSim();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-3xl border bg-card p-2.5 shadow-card">
      <Btn primary disabled={mode !== "stopped"} onClick={() => setMode("running")}>
        <Play className="h-3.5 w-3.5" /> Start
      </Btn>
      <Btn disabled={mode !== "running"} onClick={pauseSim}>
        <Pause className="h-3.5 w-3.5" /> Pause
      </Btn>
      <Btn disabled={mode !== "paused"} onClick={() => setMode("running")}>
        <Play className="h-3.5 w-3.5" /> Resume
      </Btn>
      <Btn disabled={mode === "running"} onClick={stepOnce}>
        <StepForward className="h-3.5 w-3.5" /> Single Step
      </Btn>
      <Btn
        onClick={() => {
          resetSim();
          toast("Simulation reset", { description: "Press Start to run again." });
        }}
      >
        <RotateCcw className="h-3.5 w-3.5" /> Reset
      </Btn>
      <span className="mx-1 h-6 w-px bg-border" />
      <AddTaskDialog>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-card px-3.5 text-[12px] font-semibold hover:bg-secondary">
          <PlusCircle className="h-3.5 w-3.5 text-primary" /> Add Task
        </button>
      </AddTaskDialog>
      <Btn
        onClick={() => {
          const n = getEngine().allocate();
          bump();
          if (n) toast.success(`Auto-assigned ${n} task${n > 1 ? "s" : ""}`);
          else toast("No pending tasks or free robots");
        }}
      >
        <Wand2 className="h-3.5 w-3.5 text-success" /> Auto Assign
      </Btn>
      <div className="ml-auto flex items-center gap-1 rounded-full bg-secondary p-1">
        <FastForward className="mx-1.5 h-3.5 w-3.5 text-muted-foreground" />
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={cn(
              "h-7 rounded-full px-2.5 font-mono text-[11px] font-semibold transition",
              speed === s ? "bg-card text-primary shadow-card" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
