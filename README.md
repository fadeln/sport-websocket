# Sport WebSocket Application

This is a Node.js application that provides a WebSocket server for real-time sports updates, including match creation and commentary.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm

## Installation

1. Clone this repository.
2. Install dependencies:

```bash
npm install
```

## Running the Application

To run the application in development mode:

```bash
npm run dev
```

This will start the server using `tsx` and watch for file changes.

## Available Scripts

- `npm run dev`: Runs the application in development mode with hot-reloading.
- `npm run db:generate`: Generates database migrations using Drizzle.
- `npm run db:migrate`: Applies database migrations.
- `npm run seed`: Seeds the database with initial data.

## Project Structure

- `src/index.ts`: Main entry point for the HTTP and WebSocket server.
- `src/ws/server.ts`: WebSocket server implementation.
- `src/routes/`: Express routes for matches and commentary.
- `src/db/`: Database schema and configuration.
- `src/seed/`: Database seeding scripts.
