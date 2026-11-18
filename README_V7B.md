# Wuhan 3D Urban Lab V7B · Traffic Flow Pilot

## Run

Extract the complete ZIP, open the folder in VS Code, and open `index.html` with **Live Server**. Internet is needed for MapLibre, Three.js, and the OSM raster basemap. No Python or Node is required at runtime.

## V7B additions

- **Traffic Flow / 交通流** top-bar tab, independent of the left sidebar. Includes a bilingual step-by-step explanation and traffic metrics.
- Background fleet slider **1–100** cars (previously 1–40), with staged test guidance. The number applies to background vehicles; V7A planned navigation cars/buses are additional.
- **Route-level car following**: an IDM-inspired desired-gap controller, with a tunable following time gap. Cars on the *same candidate route* maintain a minimum longitudinal gap. This is not lane-aware collision avoidance and does not coordinate cars from different routes at intersections.
- **Synthetic junction signal experiment**: adjustable cycle and green time. Candidate-route edge junctions serve as schematic stop locations, not verified traffic lights or stop lines. Different route groups do not share a physically consistent signal phase.
- **Traffic dashboard**: active vehicles, stopped/dwelling, mean speed, buses.
- Background fleet regeneration preserves V7A planned vehicles, unlike a full reset of all cars.
- The V7A Navigation, Bus Editor, bus stop data, 3D camera, rail simulation, buildings, landmarks and environment files remain included.

## Important limitations / NOT YET DONE

- **Lane geometry and lane changes:** not implemented. Requires reliable lane counts, lane direction and intersection connection modeling. Not safe to claim citywide lane-level realism.
- **Real-world traffic signals:** not implemented. OSM signal position and phase data have not been independently verified.
- **Cross-route collision avoidance and complete queue formation:** not implemented. Following only applies when cars share the same candidate route ID.
- **200/300-car performance:** not claimed. The existing 3D car model uses many individual meshes; 100 vehicles is a testable limit, not a guaranteed FPS target.
- **Road closures from V7A:** still apply to the V7A route planner, not to pre-existing background traffic.
- **Bus scheduling:** V7A still creates 1–8 buses along a planned route; a complete depot, timetable, priority and dispatch model is not yet included.
- **Route endpoints:** V7A/V4 car respawn semantics remain, including possible stopped cars at visible endpoints.

## Acceptance checklist

1. Confirm V7A Navigation and Bus Editor still work, including custom vehicles and route editing.
2. Open Traffic Flow tab. Set 40, 60, 80, then 100 background vehicles, applying each step; monitor browser FPS and responsiveness.
3. Turn same-route following on/off and adjust headway. Observe speed and stopped vehicle counts.
4. Enable synthetic signals, change green time and cycle. Observe speed reductions and stopping; disable again.
5. Spawn V7A navigation car and buses, then change background fleet size; verify the planned vehicles remain.
6. Confirm trains, buildings, camera follow, settings, weather, landmarks, Chinese/English interface all still work.
7. Use F12 Console to check for WebGL errors and performance degradation.

## Test status

- JavaScript syntax checks: completed.
- Node.js deterministic traffic core tests: completed.
- Inherited V7A routing-data tests: completed.
- Browser end-to-end testing: **not completed** because this environment blocks localhost navigation (`ERR_BLOCKED_BY_ADMINISTRATOR`). Actual visual and GPU performance validation must be done on the user's PC.

© OpenStreetMap contributors · ODbL. Traffic behavior and signals are schematic simulation assumptions.
