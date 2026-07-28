# who-pressed-the-fucking-glyph 🛡️😤

Every Dota 2 player has screamed it into the mic: **"WHO PRESSED THE GLYPH?!"**
The game never tells you. This project tries to.

> Built in public. The point is to watch the process, not just the result.

## The idea
A real-time overlay for Dota 2 that surfaces the info the game hides — starting with the eternal question of who just wasted the team's **Glyph of Fortification** (and Scan).

## Status: 🧪 day 1 — GSI probe
Right now this is a **probe**, not the tool yet. A tiny local listener that prints exactly what Dota 2's official **Game State Integration (GSI)** API exposes in real time — so we find out *empirically* whether "who pressed glyph" is even obtainable legally.

## Why GSI (and not a hacky overlay)
- **GSI** = Valve's official, ban-safe way to read live game state to a local endpoint.
- Reading game memory / injecting anything = **VAC ban risk**. We don't do that.
- The open question this repo answers first: **does GSI expose glyph/scan usage — and the player who triggered it?**
  - If yes → live "who did it" callout overlay.
  - If not live → fallback to post-game **replay parsing** (OpenDota / clarity).

## Run the probe
```bash
node server.js          # pure Node, zero deps — listens on http://localhost:3000
```
Then copy `gamestate_integration_insomnia.cfg` into your Dota GSI config folder:
```
.../Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/
```
Launch any match (a bot match is enough). Live state prints to the console; the full payload is saved to `last-state.json` for inspection.

## Roadmap
- [ ] **Probe** — map what GSI actually exposes (glyph? scan? buildings? who?)
- [ ] If glyph-presser is available live → the callout overlay
- [ ] If not → live timer/alert overlay (glyph/scan CD, roshan, buyback) + optional post-game "who wasted it" from replay
- [ ] Ship as an Overwolf app / standalone overlay

## Stack
Pure Node listener today. Overlay layer (Overwolf / Electron / web overlay) comes after we know what GSI gives us.

---
Made in Bishkek 🇰🇬 · part of the `insomnia_` gaming/AI tooling.
