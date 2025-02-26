# SyncDoc Chat

A real-time chat application built with Express, Socket.IO, and htmx.

## Prerequisites

- [Bun](https://bun.sh/) installed on your system

## Installation

1. Install dependencies:
```bash
bun install
```

2. Start the server:
```bash
bun run start
```

3. Open your browser and navigate to `http://localhost:3000`

## Features

- Real-time bidirectional communication
- User differentiation (distinguishes between your messages and others)
- Automatic user identification
- Message timestamps
- Modern, responsive UI
- User join/leave notifications
- Typing indicators

## How it works

The application uses:
- Express for serving static files and handling HTTP requests
- Socket.IO for real-time bidirectional communication
- htmx for AJAX requests and enhanced interactivity
- UUID for generating unique user IDs
- Cookies to persist user identity between sessions

User messages are displayed differently based on whether they are from the current user or others, making it easy to follow conversations.

## Technologies Used

- Express.js
- Socket.IO
- htmx
- HTML5/CSS3
- JavaScript (ES6+)
- UUID
- Cookie-Parser
