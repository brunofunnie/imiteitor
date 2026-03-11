## Why

The dev environment is only accessible from localhost. To test from other devices on the local network (e.g., mobile, other machines), the Vite dev server and backend CORS need to allow connections from the LAN IP `192.168.3.21`.

## What Changes

- Configure Vite dev server to bind to all interfaces (`host: true`) so it's accessible at `192.168.3.21:5173`
- Update Vite proxy to route API calls to the backend at `192.168.3.21:8000`
- Add `http://192.168.3.21:5173` to the backend CORS allowed origins
- Update `FRONTEND_URL` in config to use the network IP

## Capabilities

### New Capabilities
- `dev-lan-access`: Dev environment network accessibility configuration for LAN IP 192.168.3.21

### Modified Capabilities

## Impact

- **Frontend**: `vite.config.ts` — add `host: true`, update proxy target
- **Backend**: `config.py` — update `FRONTEND_URL`; `main.py` — add LAN origin to CORS
- **No production impact**: These are dev-only configuration changes
