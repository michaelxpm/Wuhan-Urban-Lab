# Wuhan 3D Urban Lab — Phase 7A

## Launch
Unzip everything, open `index.html` with **VS Code Live Server**. Internet required for MapLibre, Three.js and OSM raster tiles. No Python or npm needed at runtime.

## What's new
- **Routes & Bus** top-bar workspace with Navigation, Bus Editor, and Bus Stops tabs. All new tabs have bilingual, task-specific instructions.
- Road Lab V2 directed road graph, trimmed to pilot bounding box **114.17–114.30 E, 30.54–30.625 N**. The map and existing train/vehicle pilot remain intact.
- Shortest-distance and estimated-fastest directed road routing using Dijkstra in a dedicated Web Worker. Distances are Road Lab graph lengths; time is a simple speed-based estimate, **not real traffic ETA**.
- Pick start/end by clicking near road nodes; draw routes and create 3D navigation cars on computed geometry.
- Close a selected directed road arc, reroute, reopen all. Closures affect the new planning worker, **not** the original free-roaming traffic or historical Road Lab.
- Search 367 usable OSM bus stop/platform objects, add/edit/reorder up to 25 stops; custom stop placement; generate routed bus line; create 1–8 bus vehicles, dwell at stop positions. Export/import editable route JSON.
- 3D landmark shell collision fix: MapLibre's building extrusions for OSM way/99463468 (Guishan TV Tower) and way/450740194 (Wuhan Center) are removed when building GeoJSON is loaded; their dedicated Three.js models remain.
- Existing train, road traffic, camera, environment, bilingual and settings remain.

## Important boundaries and reliability
- OSM bus data: **1,894** source objects across the larger rectangle; **367** named, road-near objects inside the 7A pilot network. Some are duplicates, opposite-side stops, or uncertain positions. Snapping to a nearby road node does not verify the correct carriageway or actual boarding location.
- The route engine respects **directed graph edges**. It does **not** parse OSM turn-restriction relations. Some intersection turns may be prohibited in reality.
- Navigation uses the core 7A network; roads outside this area are not navigable in the new editor. Some valid start/end pairs may be disconnected and are reported as such.
- New planned cars and buses reuse the original 3D renderer. They may traverse portions of the routing network outside the original V5 3D road-surface pilot; the underlying OSM 2D road remains visible there.
- Bus dwell points are projected to the planned route by nearest geometric point. No passenger simulation, accurate bus bays, or timetable dispatch is claimed. Fleet size means initial vehicles spaced along the route, not scheduled headways.
- Existing free-roaming vehicles remain on their original synthetic paths; closure and rerouting apply to the planning workspace only.
- Buildings are excluded by their exact OSM IDs, not hidden by depth-test hacks. The map still includes their base footprints in source files.
- The new routing data are derived from user-provided Road Lab V2; original graph and OSM records are unchanged.

## Suggested acceptance tests
1. Old V5 features: train, 40 cars, camera follow, 3D buildings, trees, weather, settings and bilingual still work.
2. Open Routes & Bus → Navigation, pick start and end near roads. Calculate shortest and fastest. Check the line follows roads and create a moving 3D car.
3. Close a directed road arc and reroute. Check route changes or an honest no-route message. Reopen all.
4. Bus Editor: search for real stop names, add 3–5 stops, reorder, calculate line and spawn a bus. Confirm stopping behavior. Try custom stops and import/export.
5. Verify Guishan TV Tower and Wuhan Center no longer have a surrounding 2.5D extrusion shell.
6. Switch Chinese/English and check the new workspace. Check F12 Console and network requests.

## Development audit
- `data/routing7a.json`: 5,564 road nodes, 12,172 directed arcs, 367 named stops, ~1.85MB.
- `scripts/build_v7a.py`: offline preparation script (uses scipy; source ZIP paths are development-environment specific). **Not needed for running the website.**
- `scripts/check_v7a.py`: static graph integrity and sampled reachability checks.
- `routing7a.worker.js`: independent Dijkstra worker.
- `mobility7a.js`: new navigation/bus workspace.

© OpenStreetMap contributors · ODbL. Routing and bus service are experimental and not official Wuhan public transport guidance.
