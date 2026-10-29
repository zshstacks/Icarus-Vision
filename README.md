# Icarus Vision

Real-time aircraft tracking dashboard. Polls live ADS-B data from the OpenSky Network, streams it via WebSockets, and renders it on a custom MapLibre map.


https://github.com/user-attachments/assets/55ec1c2f-af74-4923-8482-e9c097cf35b1


## Features

- Live map with a custom dark theme.
- Clickable aircraft to view telemetry, flight routes, and historical altitude profiles.
- JWT authentication with refresh token rotation and reuse detection.
- WebSocket streaming with automatic reconnection logic.
- Dockerized for easy local setup.

## Tech Stack

- **Frontend:** React, Redux Toolkit, TypeScript, Tailwind CSS, MapLibre GL, Vite
- **Backend:** Go, Echo v5, WebSockets, Prometheus
- **Database:** PostgreSQL + PostGIS
- **Infra:** Docker, Nginx

## Getting Started

### Prerequisites

- Docker and Docker Compose
- OpenSky Network API credentials (Client ID and Secret)

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/zshstacks/Icarus-Vision.git
   cd Icarus-Vision
   ```

2. Set up your environment variables:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   Add your OpenSky credentials to `backend/.env`.

3. Build and run the stack:
   ```bash
   cd deploy
   docker compose up --build -d
   ```

4. Open http://localhost:5173 in your browser.

## Architecture

- **Ingest Worker:** Polls OpenSky every 120 seconds and normalizes the data.
- **Broadcaster:** Receives the normalized tracks, pushes them to the WebSocket hub, and writes them to Postgres.
- **Database:** Uses PostGIS to store the latest aircraft states and historical position trails.
