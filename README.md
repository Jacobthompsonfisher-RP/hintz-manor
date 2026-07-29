# Hintz Manor - Clue-Style Murder Mystery Engine for FoundryVTT (V14)

![Foundry V14](https://img.shields.io/badge/Foundry-V14.363+-orange.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

**Hintz Manor** transforms tactical map movement and combat turns into a deduction-driven murder mystery engine inspired by *Clue* / *Cluedo*.

---

## Key Features

- 🕵️ **Per-Turn Travel & Sightline Tracking**: Automatically logs token movements, room entrances/exits, line-of-sight raycasting, and character encounters per turn.
- 🎲 **Semi-Autonomous Cascading NPC Pathing**:
  - **Co-Travel Preference**: Configurable odds (`coTravelProbability`) for NPCs to follow characters they currently share a room with.
  - **Novelty Room Weighting**: Configurable preference (`noveltyWeight`) prioritizing unvisited rooms within movement range.
  - **Agenda Vectoring**: Paths towards rooms housing target tools/weapons required for the crime.
  - **GM Canvas Path Overlay**: Visual ghost preview of suggested NPC paths for GM one-click execution or auto-play.
- 🗡️ **Opportunity & Crime Trigger Engine**: Evaluates when an NPC has collected a crime tool, reached an isolated room with a victim, and has 0 witnesses in line of sight. Automatically freezes the canonical solution set and drops physical clue traces.
- 📑 **Interactive Detective Notebook (ApplicationV2)**: System-agnostic V14 UI allowing players to eliminate suspects, weapons, and rooms, view turn timelines, and inspect evidence.
- 👑 **GM Mystery Control Panel**: Complete setup panel for managing mystery parameters, role assignments, weapon placements, and crime simulations.

---

## Installation & Setup

1. Copy the `dist` directory or release manifest into your FoundryVTT `Data/modules/hintz-manor` directory.
2. Enable **Hintz Manor** in your World Settings.
3. Define **Scene Regions** for your map rooms (e.g. tag regions with names like "Library", "Study", "Ballroom").
4. Open the **GM Mystery Panel** from the standard controls menu to initialize roles, place weapons, and start the mystery tracker!

---

## Developer Build

```bash
npm install
npm run build   # Build distribution files to dist/
npm run dev     # Watch mode for continuous development
```
