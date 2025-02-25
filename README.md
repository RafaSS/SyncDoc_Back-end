# Bun WebSocket Demo

A simple WebSocket demo using Bun and Socket.IO.

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

3. Open `index.html` in your web browser

## Features

- Real-time bidirectional communication
- Simple chat interface
- Broadcast messages to all connected clients

## How it works

The server runs on port 3000 and handles WebSocket connections using Socket.IO. The client can connect to the server and send/receive messages in real-time.
