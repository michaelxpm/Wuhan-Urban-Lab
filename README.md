# Phase 7B.1 stability patch

See **README_V7B1.md** for changes, audit results and acceptance steps.

# Wuhan 3D Urban Lab — Phase 5AB / Immersive Camera & City Explorer

## Run
Unzip the entire archive, open the folder in VS Code, right-click `index.html` → **Open with Live Server**. Internet access is required for MapLibre, Three.js and OSM tiles. No Node/npm is required.

## What is new
- **Camera Studio** in the top bar: Free Camera, Train Chase, Car Chase, and approximate low-angle Train Forward / Car Forward modes.
- Choose a vehicle using the existing vehicle selector; the Camera Studio follows that vehicle. The existing Line 1 simulation provides train telemetry.
- Follow distance and orbit angle sliders; speed/distance/next-station HUD; free-camera presets (aerial, top-down, low angle, side).
- Wuhan City Tour through four verified/source-identified places: Wuhan Center, Guishan TV Tower, Qiaokou Road–Taipingyang and Zongguan. Tour is scripted camera movement, not a generated rail/driving route.
- Save up to 12 camera views locally in the browser, restore/delete views. Screenshot PNG request, browser fullscreen, and cinematic sidebar hiding (press C to toggle UI).
- The camera interface has Chinese/English translations. Existing Settings, Instructions, keyboard controls, rail/road simulations, building, water, green and landmark layers remain.

## IMPORTANT technical limits
- This version deliberately **does not claim to be a full first-person train cab or car cockpit**. MapLibre's shared map camera limits low-angle and near-ground rendering. Forward mode is an approximation, and buildings may occlude the view.
- Screenshot uses canvas export and can fail due to GPU/browser/cross-origin restrictions. A status message explains failure. No video recording is included.
- No manual driving, interior carriages, or collision detection. Those would require additional 3D assets and a separate free-camera/physics architecture.
- The train simulation still has a single train consist; the Camera Studio follows that train. Car routes and bus stops remain simulated.
- Saved views are stored in localStorage on the same Live Server origin, not uploaded anywhere.

## Acceptance checklist
1. Existing 3D train, car, 2.5D buildings, landmarks, green/water, settings and bilingual controls still work.
2. Start train, open Camera Studio, choose Train Chase; verify smooth tracking and HUD; test forward approximation.
3. Choose a car in the existing sidebar, select Car Chase; verify tracking and HUD while turning.
4. Test distance and orbit, switch to free mode, use presets.
5. Start/stop City Tour; check all four locations and interruption by user.
6. Save and restore a view, delete it; reload and verify local persistence.
7. Test fullscreen, PNG screenshot (may be browser-restricted), cinematic UI toggle (C).
8. Switch Chinese/English; test original shortcuts, train and 40 cars simultaneously; inspect browser console.

## Source and assumptions
© OpenStreetMap contributors, ODbL. Railway elevation 8 m and many building heights are simulated. Wuhan Center and Guishan TV Tower are stylized models with recorded approximate coordinates. Road traffic is a synthetic demonstration over real OSM geometry.
