import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEngine } from "@/sim/store";
import type { TaskStatus } from "@/sim/engine";
import { Button } from "@/components/ui/button";
import { AddTaskDialog } from "@/components/dashboard/AddTaskDialog";
import { Pill, TASK_LABEL, TASK_TONE, simTime, type Tone } from "@/components/dashboard/common";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Task Management · Warehouse Operations" },
      { name: "description", content: "Create pickup and delivery tasks and track them from pending to completed." },
      { property: "og:title", content: "Task Management · Warehouse Operations" },
      { property: "og:description", content: "Create pickup and delivery tasks and track them from pending to completed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TasksPage,
});

const COLS: TaskStatus[] = ["pending", "assigned", "in_progress", "completed"];
const PRI: Record<string, Tone> = { high: "red", normal: "blue", low: "grey" };

function TasksPage() {
  const engine = useEngine();
  return (
    <div className="mx-auto flex max-w-[1680px] flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[30px] font-light tracking-tight">Task Management</h1>
          <p className="text-[13px] text-muted-foreground">
            Greedy allocation · priority queue ordered by priority, then creation time
          </p>
        </div>
        <AddTaskDialog>
          <Button className="rounded-full">
            <Plus className="h-4 w-4" /> Add New Task
          </Button>
        </AddTaskDialog>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {COLS.map((c) => {
          const items = engine.tasks.filter((t) => t.status === c);
          const shown = c === "completed" ? items.slice(0, 30) : items;
          return (
            <div key={c} className="flex min-h-[300px] flex-col rounded-3xl border bg-card p-4 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <Pill tone={TASK_TONE[c]}>{TASK_LABEL[c]}</Pill>
                <span className="text-[12px] text-muted-foreground">{items.length}</span>
              </div>
              <div className="flex max-h-[640px] flex-col gap-2 overflow-y-auto pr-1">
                {shown.length === 0 && <div className="rounded-2xl border border-dashed p-4 text-center text-[12px] text-muted-foreground">No tasks</div>}
                {shown.map((t) => (
                  <div key={t.id} className="rounded-2xl border bg-background/60 p-3 text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold">{t.id}</span>
                      <Pill tone={PRI[t.priority]} className="text-[10px] capitalize">{t.priority}</Pill>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                      <span className="text-muted-foreground">Pickup</span>
                      <span className="text-right font-medium">{t.pickup}</span>
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="text-right font-medium">{t.delivery}</span>
                      <span className="text-muted-foreground">Package</span>
                      <span className="text-right font-mono">{t.packageId}</span>
                      <span className="text-muted-foreground">Robot</span>
                      <span className="text-right font-semibold text-primary">{t.robotId ?? "—"}</span>
                      <span className="text-muted-foreground">Created</span>
                      <span className="text-right font-mono">{simTime(engine, t.createdTick)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
