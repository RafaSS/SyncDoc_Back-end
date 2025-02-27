import { Server as SocketIOServer } from 'socket.io';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Types
interface User {
  userId: string;
  username: string;
}

interface MessageData {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: string;
}

// Create Express app
const app = express();

// Set up Express middleware
app.use(express.static(path.join(import.meta.dir, '..'))); // Serve static files from parent directory
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Try different ports if default is in use
const PORT = parseInt(process.env.PORT || '3000', 10);
const users = new Map<string, User>(); // Store user data: socket.id -> { username, id }

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(import.meta.dir, '..', 'dist', 'index.html'));
});

// Generate a username if none exists
app.get('/api/user', (req, res) => {
  let userId = req.cookies.userId;
  let username = req.cookies.username;
  
  if (!userId) {
    userId = uuidv4();
    username = `User-${userId.substring(0, 5)}`;
    
    // Set cookies for 30 days
    res.cookie('userId', userId, { maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.cookie('username', username, { maxAge: 30 * 24 * 60 * 60 * 1000 });
  }
  
  res.json({ userId, username });
});

// HTMX endpoints
app.get('/api/messages', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end(''); // Initially empty, will be populated via WebSockets
});

// Create server instances
const server = app.listen(PORT, () => {
  console.log(`🦊 Server started on http://localhost:${PORT}`);
});

// Initialize Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS || '*',
    methods: ['GET', 'POST']
  }
});

// WebSocket handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Store user data when they identify themselves
  socket.on('identify', (userData: User) => {
    users.set(socket.id, userData);
    console.log(`User identified: ${userData.username} (${userData.userId})`);
    
    // Notify others that a user has joined
    socket.broadcast.emit('user-joined', {
      message: `${userData.username} has joined the chat`,
      timestamp: new Date().toISOString()
    });
  });

  // Handle incoming messages
  socket.on('message', (data: string) => {
    const user = users.get(socket.id) || { username: 'Anonymous', userId: 'unknown' };
    const messageData: MessageData = {
      id: uuidv4(),
      userId: user.userId,
      username: user.username,
      text: data,
      timestamp: new Date().toISOString()
    };
    
    console.log('Received message:', messageData);
    // Broadcast to all clients including sender (sender will know it was their message via userId)
    io.emit('message', messageData);
  });

  // Handle typing indicators
  socket.on('typing', (data: { username: string; isTyping: boolean }) => {
    socket.broadcast.emit('typing', data);
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`User disconnected: ${user.username} (${user.userId})`);
      socket.broadcast.emit('user-left', {
        message: `${user.username} has left the chat`,
        timestamp: new Date().toISOString()
      });
      users.delete(socket.id);
    }
  });
});

// Export for testing
export { app, server, io };
