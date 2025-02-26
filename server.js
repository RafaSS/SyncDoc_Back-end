import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3000;
const users = new Map(); // Store user data: socket.id -> { username, id }

// Middleware
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
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

// WebSocket handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Store user data when they identify themselves
  socket.on('identify', (userData) => {
    users.set(socket.id, userData);
    console.log(`User identified: ${userData.username} (${userData.userId})`);
    
    // Notify others that a user has joined
    socket.broadcast.emit('user-joined', {
      message: `${userData.username} has joined the chat`,
      timestamp: new Date().toISOString()
    });
  });

  // Handle incoming messages
  socket.on('message', (data) => {
    const user = users.get(socket.id) || { username: 'Anonymous' };
    const messageData = {
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
    } else {
      console.log('Unknown client disconnected:', socket.id);
    }
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
