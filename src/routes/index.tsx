import { createFileRoute } from "@tanstack/react-router";
import { StatCards } from "@/components/dashboard/StatCards";
import { WarehouseView } from "@/components/warehouse/WarehouseView";
import { SimControls } from "@/components/dashboard/SimControls";
import { RobotInfoPanel } from "@/components/dashboard/RobotInfoPanel";
import { RobotActivity, TopRobots } from "@/components/dashboard/BottomCards";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Warehouse Simulation · Warehouse Operations" },
      { name: "description", content: "Live 3D simulation of autonomous mobile robots moving packages through an automated warehouse." },
      { property: "og:title", content: "Warehouse Simulation · Warehouse Operations" },
      { property: "og:description", content: "Live 3D simulation of autonomous mobile robots moving packages through an automated warehouse." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SimulationPage,
});

function SimulationPage() {
  return (
    <div className="mx-auto flex max-w-[1680px] flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[30px] font-light tracking-tight">Warehouse Operations</h1>
          <p className="text-[13px] text-muted-foreground">Autonomous fleet coordination · Zone B · 26 × 18 grid</p>
        </div>
      </div>
      <StatCards />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="h-[560px] 2xl:h-[640px]">
            <WarehouseView />
          </div>
          <SimControls />
        </div>
        <RobotInfoPanel />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <TopRobots />
        <RobotActivity />
      </div>
    </div>
  );
}
