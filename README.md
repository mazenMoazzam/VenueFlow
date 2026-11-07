# VenueFlow

VenueFlow is a full-stack web application that lets users collaboratively plan and manage events. It combines planning, financial tracking, venue design, and team collaboration in one centralized app.

## Getting started

This repository currently contains the first application skeleton: a small Express server and an empty frontend entry point.

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

Endpoint:

- `GET /api/health` — confirms the server is running
- `GET /api/empty` — simple empty route for testing

### Project structure

```text
server.js       Express entry point
public/         Frontend HTML, CSS, and browser JavaScript
routes/         Small API route modules
```

The frontend and data layer intentionally start empty so the application can be built up incrementally.

## Features

- Create events and invite others to help organize them
- Design customizable venue floor plans with drag-and-drop
- Manage budgets
- Assign tasks
- Create event schedules
- Record important planning decisions
