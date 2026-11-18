# Wuhan 3D Urban Lab · Phase 7B.1 (Stability & Junction Audit)

## Run
Unzip the entire ZIP and open `index.html` via **VS Code Live Server**. Keep the `data/` folder. Network access is needed for MapLibre, Three.js and OSM raster tiles.

## What changed
1. **Hotkeys**: Fixes persistent focus from range sliders/checkboxes and clears focused form controls on map pointer-down. Keeps text fields and selects protected while typing. The camera panel shows hotkey status. Settings' global enable switch remains authoritative. Keys: WASD pan; Q right/E left bearing; R lower/F raise pitch; Z zoom in/X out; T/G follow; Esc exit; Space train pause.
2. **Collapsible sidebar**: The six requested groups are HTML `<details>` panels; state persists locally. Navigation is left open. Removes the redundant introduction card. Tool buttons and fold headers have bilingual hover/focus guidance bubbles.
3. **Traffic diagnosis**: Adds per-selected-car stop reasons (`moving`, `following`, `red_signal`, `bus_stop`, `slow_or_queued`, `destination`, `respawn`, `recovery`), approximate wait time, and recovery counter in Traffic Flow. Background cars that remain blocked without a valid red signal/bus stop for 45 simulated seconds are removed and recycled; they are NOT forced through the blocking vehicle. Planned navigation cars and user buses are never recycled by this rule.
4. **Terminal cleanup**: Background cars at a route end are hidden and respawned after a short interval, rather than remaining stationary indefinitely in the visible scene. External/planned vehicles remain at their destinations.
5. **Elevated-road audit**: A separate dashed amber debug overlay shows OSM-tagged bridge roads in the test region. The existing background-route generator explicitly excludes tagged bridges/tunnels. Thus scarce elevated traffic is a **confirmed source-data policy**, not merely random routing. This version does not fake elevated vehicle heights or change the navigation graph.
6. **Junctions**: Retains connected directed route geometry, curve-speed profiles, red-light braking and safe following constraints. It does not implement lane-level right-turn connectors, actual Wuhan signal phasing, or conflict-free multi-route intersections; those remain for the V7C pilot. No unsupported claim of full junction normalization is made.

## How to test
- Open Settings and enable keyboard controls. Click a range slider, then use WASD/QE/RF/ZX. Click the map to clear focus from a select input. A text input or open dropdown intentionally captures keyboard events.
- Open Traffic Flow, enable synthetic signals and following. Select a car in the left sidebar and inspect the diagnosis. Run 15–30 minutes of **simulated** traffic at 5x or 10x, checking that background cars do not accumulate permanently at endpoints.
- Enable the elevated-road audit overlay. Amber dashed roads show real tagged bridge **plan geometry**, not 3D deck height. Cars are not expected to use these roads in background traffic yet.
- Hover the top navigation buttons and the six sidebar group headers. Click to fold/unfold. Refresh to check saved fold states.
- Test Navigation, Bus Editor, railway, 3D landmarks, camera follow, Chinese/English and settings.

## Technical audit
`data/bridge_audit7b1.json` shows 89,000 directed arcs in the Road Lab source, including 2,609 bridge-tagged arcs and 396 tunnel-tagged arcs. 402 bridge-tagged arcs intersect the study bbox. `scripts/build_road3a.py` filters bridge/tunnel=yes, leaving 0 tagged bridge arcs in 2,914 background road segments and 85 background routes. **No real bridge heights were present** in this dataset. The V7A routing graph is a separate dataset; its bridge access and actual vehicle height are not verified by this audit.

## Limitations and next phase
- Route-level following only; shared-lane occupancy across independent routes remains unmodeled.
- Synthetic red signals may cause unrealistic stops; their positions are derived from route junctions, not surveyed stop lines.
- Recovery is a defensive fallback, not a traffic physics solution. A recovery counter is exposed for diagnosis.
- Dedicated right-turn lanes and interchange 3D heights need verified OSM tags, geometry and a local V7C pilot.
- No live browser WebGL acceptance was possible in this environment due to `ERR_BLOCKED_BY_ADMINISTRATOR` for localhost; actual Live Server validation is required.

© OpenStreetMap contributors, ODbL.
