FST 30min Poker Drill
=====================

Local practice web app for daily 30/45/60 minute poker drills focused on instant mental calculations for Pot Odds (required equity to call) and Fold Equity (required fold% for breakeven bluffs).

Quick Start
-----------

Prereqs: Node.js LTS on Windows/macOS/Linux.

1) Install deps

   npm i

2) Start dev server

   npm run dev

Open http://localhost:5173

Features
--------

- Mode selector: MIXED / POT_ODDS / FE / RANGE3
- 30/45/60 min presets + custom minutes, Start/Pause/Reset; hard stop at time up
- Generates questions
  - POT_ODDS: required equity = b / (p + 2b)
  - FE: required fold% = b / (p + b)
- RANGE3: classify strength as Strong/Medium/Weak given hand category + board texture + position
- 4 choices including typical mistakes; shows explanation after answer
- Hotkeys: 1..4 choose, N next, S/Space start/pause, R reset
- Persists stats (accuracy, count, avg time) in localStorage
- Review Mistakes: toggle to drill only your saved mistakes; clearable from header

Manual
-----
- See full Japanese usage guide in `使用マニュアル.md` at repo root.
