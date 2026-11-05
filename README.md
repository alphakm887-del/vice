# PROJECT ALPHA: VICE COAST

A browser-playable 3D open-world driving prototype built with Three.js, TypeScript, Vite and Rapier 3D.

## Run locally

1. Install Node.js 20.19+ (or a current supported Node LTS).
2. Open a terminal in this folder.
3. Run `npm install`.
4. Run `npm run dev` and open the local URL printed by Vite.
5. Run `npm run build` to create the production build in `dist/`.

## Controls

- **WASD** — walk / drive
- **Shift** — sprint on foot
- **E** — enter the nearest car / exit current car
- **Space** — handbrake while driving
- **C** — switch chase / cockpit camera while driving
- **Esc** — pause

## Prototype scope

This first slice includes a procedural coastal district, collision-backed static ground, Rapier rigid-body vehicles, a kinematic player controller, vehicle entry/exit, chase camera, HUD, and pause/reset controls. It is intentionally a foundation, not a claim that the full five-region story game is complete. Traffic, pedestrians, mission chains, police AI, interiors, weather, full wheel/suspension simulation, and gamepad remapping are planned next systems.

## Notes

The project uses original procedural geometry and placeholder vehicle/character shapes. Replace or extend these with properly licensed GLB assets as the project grows.
