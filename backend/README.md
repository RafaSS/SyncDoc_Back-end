# SyncDoc Backend

This directory contains the backend code for the SyncDoc collaborative document editing application.

## Structure
- `src/` - Source code
  - `app.ts` - Main application file
  - `controllers/` - Request handlers
  - `models/` - Data models and repositories
  - `services/` - Business logic
  - `socket/` - WebSocket functionality
  - `routes/` - API route definitions
  - `config/` - Configuration settings
  - `utils/` - Utility functions

## Development
To run the backend locally:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

By default, this will run the backend on http://localhost:8080.
