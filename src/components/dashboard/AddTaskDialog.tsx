import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getEngine, useSim } from "@/sim/store";
import type { Priority } from "@/sim/engine";

export function AddTaskDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const engine = getEngine();
  const pickups = engine.locations.filter((l) => l.kind === "pickup");
  const docks = engine.locations.filter((l) => l.kind === "delivery");
  const [pickup, setPickup] = useState("P1");
  const [delivery, setDelivery] = useState("D1");
  const [pkg, setPkg] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const bump = useSim((s) => s.bump);

  const onOpen = (o: boolean) => {
    setOpen(o);
    if (o) setPkg(getEngine().nextPackageId());
  };

  const submit = () => {
    const e = getEngine();
    const t = e.createTask({ pickup, delivery, packageId: pkg.trim() || undefined, priority });
    bump();
    setOpen(false);
    toast.success(`${t.id} created`, { description: `${t.packageId}: ${pickup} → ${delivery}` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New pickup / delivery task</DialogTitle>
          <DialogDescription>The task joins the queue and is allocated greedily to the nearest free robot.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Task ID</Label>
              <Input value={getEngine().nextTaskId()} disabled className="font-mono" />
            </div>
            <div className="grid gap-1.5">
              <Label>Package ID</Label>
              <Input value={pkg} onChange={(e) => setPkg(e.target.value)} className="font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Pickup location</Label>
              <Select value={pickup} onValueChange={setPickup}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pickups.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.id} · {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Delivery location</Label>
              <Select value={delivery} onValueChange={setDelivery}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {docks.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.id} · {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-full">
            Cancel
          </Button>
          <Button onClick={submit} className="rounded-full">
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
