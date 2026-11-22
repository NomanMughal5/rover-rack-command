# Rover Rack Command

# Build a Premium Warehouse Robot Fleet Management Dashboard

Create a modern, premium web application called **Warehouse Operations** for a university Data Structures and Algorithms project.

The application simulates an automated warehouse where multiple autonomous mobile robots (AMRs) transport packages between storage racks, pickup stations, and delivery locations.

The goal is to create a visually impressive, interactive warehouse management system with a professional SaaS dashboard and a realistic 3D warehouse simulation.

An image is attached as a visual reference. Use it to understand the desired aesthetic, dashboard composition, card layouts, colors, typography, and overall interface style.

---

# 1. Visual Identity and Design System

Create a clean, elegant, premium industrial dashboard.

### Color palette
- Main background: Warm off-white / soft cream.
- Cards: Pure white.
- Primary accent: Coral orange.
- Secondary accent: Soft green.
- Additional accents: Muted purple and blue.
- Main text: Dark charcoal.
- Secondary text: Soft grey.

### UI characteristics
- Rounded cards and panels.
- Subtle shadows.
- Thin, light borders.
- Modern typography.
- Compact navigation.
- Elegant icons.
- Smooth transitions.
- Well-balanced whitespace.
- Professional data visualizations.

The interface should feel like a commercial warehouse automation platform rather than a conventional student project.

Avoid dark themes, excessive gradients, cluttered layouts, and unnecessary decorative elements.

# 2. Application Structure

Create only four main pages.

### Sidebar Navigation

1. Warehouse Simulation
2. Robot Fleet
3. Task Management
4. Path & Collision Monitoring

Use a compact vertical sidebar with icons, labels, and a clear active-page indicator.

### Top Navigation

Include:
- Warehouse Operations logo.
- Global search field.
- Warehouse selector.
- Simulation date/time.
- Live / Paused status.
- Notification icon.
- User profile.

Keep the navigation clean and compact.

# 3. Main Page — Warehouse Simulation

This is the most important page and should receive the highest design priority.

Create a dashboard with three main areas:

- Top: Statistics cards.
- Center: Large interactive 3D warehouse.
- Right: Robot information and warehouse status.
- Bottom: Simulation controls and robot activity.

## A. Statistics Cards

Create four premium metric cards.

**Total Robots**
- Total robot count.
- Active robots.
- Idle robots.

**Active Missions**
- Running tasks.
- Assigned missions.
- Pending missions.

**Completed Deliveries**
- Completed tasks.
- Completion rate.
- Small activity indicator.

**Collision Monitoring**
- Detected conflicts.
- Resolved conflicts.
- Current warnings.

Each card should include an icon, large numerical value, descriptive label, and subtle visual indicator.

Use realistic sample data initially. Structure the components so the values can later be connected to the simulation engine.

## B. Interactive 3D Warehouse — Main Centerpiece

Create a realistic miniature automated warehouse in the center of the dashboard.

Use Three.js or React Three Fiber.

The warehouse must be a genuine interactive 3D scene, not a static image.

### Warehouse environment

Include:
- Organized storage racks in multiple rows.
- Orange and green storage sections.
- Pickup stations.
- Delivery stations.
- Warehouse pathways.
- Multiple autonomous mobile robots.
- Packages and cargo.
- Obstacles and restricted areas.

Use a slightly elevated isometric camera perspective.

The warehouse should occupy a large portion of the available screen.

### Camera interaction

Implement:
- 360-degree horizontal rotation.
- Vertical camera rotation.
- Zoom in and out.
- Mouse drag to rotate.
- Pan controls.
- Reset camera.
- Top-view camera option.

Users should be able to inspect the warehouse from different directions.

### Robot models

Create small, realistic autonomous warehouse transport machines.

Each robot must have:
- A recognizable machine body.
- Unique ID, such as AMR-001.
- Direction indicator.
- Status indicator.
- Battery indicator.
- Current task.

Robots should look like industrial autonomous mobile robots, not simple circles or generic icons.

### Package pickup and delivery

When a robot picks up a package:
- Show a small 3D cardboard box above its body.
- Attach the package to the robot.
- Keep it synchronized with the robot's position and rotation.
- Display its package ID when selected.
- Remove the package after successful delivery.

### Navigation paths

Show connected warehouse routes.

Use:
- Green for active or available routes.
- Orange for assigned robot routes.
- Red for blocked routes or conflicts.
- Animated directional markers for robot movement.

When a robot is selected, highlight its complete navigation route.

# 4. Robot Automation Controls

Create a dedicated control section near the warehouse simulation.

Include these buttons:

| Control | Action |
|---|---|
| Start | Start the simulation |
| Pause | Pause robot movements |
| Resume | Continue simulation |
| Single Step | Advance one simulation step |
| Reset | Reset the simulation |
| Add Task | Create a pickup/delivery task |
| Auto Assign | Allocate pending tasks |
| Speed | Adjust simulation speed |

Provide speed options:
- 0.5x
- 1x
- 2x
- 4x

Use clear button states and appropriate icons.

Every control should be interactive.

# 5. Robot Information Panel

Place a compact information panel on the right side of the warehouse.

When a robot is selected, display:

- Robot ID.
- Robot model.
- Battery percentage.
- Current status.
- Current coordinates.
- Assigned task.
- Package being carried.
- Pickup location.
- Delivery destination.
- Distance travelled.

Include a small 3D robot preview or model.

When no robot is selected, show general warehouse statistics and recent robot activity.

# 6. Bottom Dashboard Sections

Create two compact cards below the warehouse.

### Top Performing Robots

Display a table containing:
- Robot ID.
- Robot name/type.
- Completed tasks.
- Battery.
- Efficiency.
- Current status.

### Robot Activity

Display:
- Missions completed.
- Active missions.
- Waiting time.
- Recent robot activities.

Use simple, elegant charts with readable labels.

# 7. Page Two — Robot Fleet

Create a dedicated fleet management page.

Display all robots in a responsive card grid.

Each robot card should show:
- Robot ID.
- Robot model.
- Status.
- Battery percentage.
- Current position.
- Assigned task.
- Current destination.

Include filters for:
- All robots.
- Active.
- Idle.
- Waiting.
- Carrying packages.

Clicking a robot should open a detailed information panel.

# 8. Page Three — Task Management

Create a simple and professional task management interface.

Include an **Add New Task** button.

The task creation modal should contain:
- Task ID (automatically generated).
- Pickup location.
- Delivery location.
- Package ID.
- Priority.

Display tasks in four categories:

- Pending.
- Assigned.
- In Progress.
- Completed.

Show:
- Task ID.
- Pickup point.
- Delivery point.
- Assigned robot.
- Task status.
- Creation time.

Allow users to create tasks and see their status change during the simulation.

# 9. Page Four — Path & Collision Monitoring

This page should demonstrate the DSA algorithms powering the application.

Include:

### Pathfinding
- Active A* routes.
- Selected robot route.
- Path length.
- Start and destination.
- Path status.

### Reservation Table
- Reserved cells.
- Time slots.
- Robot occupancy.
- Movement reservations.

### Collision Monitoring
- Detected conflicts.
- Blocked movements.
- Waiting robots.
- Opposite-direction movement conflicts.
- Replanning events.

### Event Log
Display recent events, such as:
- Robot AMR-001 assigned Task-005.
- Robot AMR-002 detected a route conflict.
- Robot AMR-002 waiting for cell availability.
- Robot AMR-001 picked up Package-014.
- Robot AMR-001 completed delivery.

Keep this page informative without overwhelming the user.

# 10. Smooth Robot Animation and Behavior

Robot movement must be smooth, natural, and consistent.

Avoid:
- Teleporting.
- Flickering.
- Sudden position jumps.
- Unnatural direction changes.
- Robots overlapping.
- Packages detaching from robots.
- Movement occurring before a route is available.

Implement:
- Smooth position interpolation.
- Time-based animation.
- Smooth rotation when changing direction.
- Consistent simulation updates.
- Proper movement sequencing.
- Synchronized package movement.
- Collision-aware movement.

Robots should move along their actual assigned routes.

Do not use random movement as a substitute for pathfinding.

# 11. Technology Stack

Use:

- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Lucide React icons.
- Three.js.
- React Three Fiber.
- React Three Drei.
- Recharts.

Use reusable components and maintain a clean project structure.

Separate the 3D warehouse, robot models, navigation paths, dashboard cards, information panels, task management, and simulation controls.

Design the frontend so that it can later communicate with a Java simulation backend.

The actual DSA algorithms will be implemented in Java:
- A* pathfinding.
- Graph-based warehouse representation.
- PriorityQueue.
- Queue.
- HashMap and HashSet.
- Greedy task allocation.
- Time-based reservation table.
- Collision detection.

For now, create a functional frontend prototype with a simulated data layer.

# 12. Responsiveness and Quality

The application should work properly on desktop and laptop screens.

Ensure:
- The warehouse remains the visual centerpiece.
- Cards align correctly.
- Sidebars do not overlap content.
- The 3D scene resizes correctly.
- Camera controls work reliably.
- Robot selection works.
- Navigation works between all four pages.
- Modals and buttons function correctly.
- No broken interactions or placeholder buttons.

# FINAL DESIGN DIRECTION

Build a premium warehouse fleet-management platform with an elegant cream-and-white dashboard, beautiful metric cards, subtle orange and green accents, and a large interactive 3D warehouse at its center.

The warehouse must contain realistic autonomous robots moving between storage racks, following visible navigation paths, picking up packages, and delivering them.

Users must be able to rotate the warehouse, zoom in, inspect individual robots, create tasks, control the simulation, and monitor pathfinding and collision events.

**The central warehouse simulation is the heart of this application. Give it the highest visual and functional priority. Keep the entire application focused exclusively on warehouse automation and multi-robot coordination.**

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rover-rack-command.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/14b5dd02-e9dc-4a30-a51e-52ed28859e26).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
