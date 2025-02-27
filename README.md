# SyncDoc Chat

A real-time chat application built with Bun, Express, and Socket.IO.

## Prerequisites

- [Bun](https://bun.sh/) installed on your system

## Installation

1. Install dependencies:
```bash
bun install
```

2. Start the development server:
```bash
bun run dev
```

3. Or build and start the production server:
```bash
bun run build
bun run start
```

4. Open your browser and navigate to `http://localhost:3000`

## Features

- Real-time bidirectional communication
- User differentiation (distinguishes between your messages and others)
- Automatic user identification
- Message timestamps
- Modern, responsive UI
- User join/leave notifications
- Typing indicators

## Development

- Run tests:
```bash
bun test
```

- Lint your code:
```bash
bun run lint
```

## How it works

The application uses:
- Bun as the JavaScript runtime
- Express for serving static files and handling HTTP requests
- Socket.IO for real-time bidirectional communication
- UUID for generating unique user IDs
- Cookies to persist user identity between sessions

User messages are displayed differently based on whether they are from the current user or others, making it easy to follow conversations.

## Technologies Used

- Bun
- Express.js
- Socket.IO
- TypeScript
- ESLint for code quality
- HTML5/CSS3
- UUID
