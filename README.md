LLM Minecraft Bot
=================

Overview
--------

This project connects a Large Language Model (LLM) planning layer to a Mineflayer-controlled Minecraft agent. Natural language requests are parsed into a plan, compiled into concrete API calls, and executed by a bot in-game via a small Express server.

What reviewers should know
--------------------------

- End-to-end: Python orchestrates planning/compilation and calls a Node.js HTTP API to control a Mineflayer bot.
- Real capabilities: travel, mine, craft, place, use blocks, get state, and simple task macros (e.g., mine_resource, kill).
- Reliability: basic retries on LLM calls; Node API adds logging, simple rate limiting, and optional API key.

Repo layout
-----------

- `bot/` Node.js Express API + Mineflayer bot (core execution)
- `llm/` Prompting, parsing, and command compilation (Python)
- `main.py` Minimal demo loop integrating planning → compilation → execution

Setup
-----

1) Minecraft bot server (Node)

```
cd bot
npm install
npm run dev
```

Environment (optional): set `PORT` and `API_KEY` to enable auth.

2) Python environment

```
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` with:

```
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
MINECRAFT_API_URL=http://localhost:5001
API_KEY=           # if you enabled it on the Node API
```

3) Run the example

```
python main.py
```

How it works
------------

1. `llm/prompt_parser.py`: Turns a user request + bot state into an ordered list of sub-tasks.
2. `llm/instruction_compiler.py`: Compiles each sub-task into concrete API calls like `travel_to`, `mine_block`, `craft_item`, `place_block`.
3. `bot/bot.py`: Python wrapper that calls the Node API endpoints.
4. `bot/api.js`: Mineflayer bot and HTTP endpoints, plus a chat command listener for in-game control.

What’s original vs. borrowed
----------------------------

- Original:
  - LLM planning and compilation prompts and glue (`llm/`), including block name normalization and structured JSON outputs.
  - Python orchestration (`main.py`) with retries and the request→plan→compile→execute loop.
  - Express API expansion (state, craft, mine_resource, kill, place variants), logging, and small reliability tweaks.
- Borrowed/Adapted:
  - Use of Mineflayer and `mineflayer-pathfinder` patterns (standard community libs, see package.json).
  - Some legacy prototypes in `bot/main.js` and `bot/new_api.js` were starting points and kept for reference.

Notes for reviewers
-------------------

- Security: The API key layer is optional and off by default; enable it if exposing the API beyond localhost.
- Repro: Tested locally on Node 18+ and Python 3.10+.
- Next steps: richer task memory, tool-use feedback to the LLM, and curriculum tasks (build structures, multi-step resource gathering).

License
-------

MIT


