## ADDED Requirements

### Requirement: Vite dev server binds to all interfaces
The Vite dev server SHALL bind to `0.0.0.0` so the frontend is accessible from the LAN at `192.168.3.21:5173`.

#### Scenario: Access from LAN device
- **WHEN** a device on the network navigates to `http://192.168.3.21:5173`
- **THEN** the Vite dev server serves the frontend application

### Requirement: Backend CORS allows LAN origin
The backend SHALL include `http://192.168.3.21:5173` in the CORS allowed origins list.

#### Scenario: API request from LAN frontend
- **WHEN** the frontend at `http://192.168.3.21:5173` makes an API request to the backend
- **THEN** the backend responds with appropriate CORS headers allowing the request
