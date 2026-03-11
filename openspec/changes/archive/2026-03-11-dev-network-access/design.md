## Context

The Vite dev server defaults to `localhost` only. The backend already binds to `0.0.0.0:8000` (accessible from network), but CORS only allows `localhost:5173` and `localhost:3000`. The machine's LAN IP is `192.168.3.21`.

## Goals / Non-Goals

**Goals:**
- Make both frontend and backend accessible from `192.168.3.21` during development
- Keep localhost access working as before

**Non-Goals:**
- Production deployment changes (handled by docker-compose)
- Dynamic IP detection or environment variables

## Decisions

### 1. Vite `host: true`

Bind Vite to `0.0.0.0` so it's accessible at `192.168.3.21:5173`. Vite natively supports this with the `server.host` option.

### 2. Keep proxy targeting localhost

The Vite proxy runs inside the dev server process, so it should still proxy to `localhost:8000` (same machine). No change needed for the proxy target.

### 3. Add LAN IP to CORS

Add `http://192.168.3.21:5173` to the CORS `allow_origins` list in `main.py`. This allows the browser at the LAN IP to make API requests.

## Risks / Trade-offs

- **[Security]** Binding to `0.0.0.0` exposes the dev server to the local network → Mitigation: Dev-only, not production; LAN is trusted
