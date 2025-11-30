# DashHack - Hackathon monitoring dashboard

[![Bun](https://img.shields.io/badge/Bun-000?logo=bun&logoColor=fff)](#)
[![Nuxt](https://img.shields.io/badge/Nuxt-002E3B?logo=nuxt&logoColor=#00DC82)](#)
[![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?logo=vuedotjs&logoColor=fff)](#)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-%2338B2AC.svg?logo=tailwind-css&logoColor=white)](#)
[![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?logo=mongodb&logoColor=white)](#)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff)](#)

**DashHack** is modern web dashboard for hackathon organization team.  
The main goal of **DashHack** is to monitor teams progress and activity during the event.  
This feature is reached by integration with GitHub API to fetch data from repositories.

The project was initially created for [AT&T Hackathon Brno 2025](https://atthack.cz).  
Over time, **DashHack** got more generic and currently, it can be used for any hackathon event.  

---

### 🛠️ Stack

- 🍞 [Bun](https://bun.sh) (can be replaced with other package managers)
- ⚡️ [Nuxt 4](https://nuxt.com)
- 🎨 [Tailwind CSS](https://tailwindcss.com)
- 🍃 [MongoDB](https://www.mongodb.com)
- 🚢 [Docker](https://www.docker.com)

---

### 💻 Run Locally (Development)

1. Set up .env file
2. `bun install`
3. `bun run dev`

### 💻 Run Locally with local DB (Development)

1. Set up .env file for local DB (example)
```env
MONGO_URI_LOCAL=mongodb://127.0.0.1:27017/dashhack_dev
url=http://localhost
discord=https://discord.com/invite/<code>
webPort=6464
```
2. `bun install`
3. `docker compose --env-file .env -f docker-compose-dev.yml up`
4. Configure VScode for debugger (`.vscode/launch.json`)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Nuxt (Node)",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "envFile": "${workspaceFolder}/.env",
      "skipFiles": [
        "<node_internals>/**"
      ]
    }
  ]
}
```
5. Start debugging with VScode

### 🏗️ Build for Production

1. `docker compose --env-file .env up --build`

---
### 📄 Attribution

**Author:** [ArimDev](https://github.com/ArimDev) ([PetyXbron](https://github.com/PetyXbron))  
**License:** Apache License 2.0 (see [LICENSE](./LICENSE))  
**Credit in pages/index.vue :** "© 2025 ArimDev".  
NOTICE file must be retained in redistributions.
