import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();
// Get __dirname equivalent in ESM
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS || "*",
        methods: ["GET", "POST"]
    }
});
// Try different ports if default is in use
const PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_PORT_ATTEMPTS = 10;
const users = new Map(); // Store user data: socket.id -> { username, id }
// Middleware
app.use(express.static(join(__dirname, '..'))); // Serve static files from parent directory
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
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
        // Set cookies for 30 days (or use value from env)
        const maxAge = parseInt(process.env.COOKIE_MAX_AGE || '2592000000', 10);
        res.cookie('userId', userId, { maxAge });
        res.cookie('username', username, { maxAge });
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
        const user = users.get(socket.id) || { username: 'Anonymous', userId: 'unknown' };
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
    // Handle typing indicators
    socket.on('typing', (data) => {
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
        else {
            console.log('Unknown client disconnected:', socket.id);
        }
    });
});
// Try to start server on PORT, if fails try PORT+1, PORT+2, etc.
let currentPort = PORT;
let attempts = 0;
function startServer(port) {
    httpServer.listen(port)
        .on('error', (err) => {
        if (err.code === 'EADDRINUSE' && attempts < MAX_PORT_ATTEMPTS) {
            console.log(`Port ${port} is in use, trying ${port + 1}`);
            attempts++;
            startServer(port + 1);
        }
        else {
            console.error('Failed to start server:', err.message);
            process.exit(1);
        }
    })
        .on('listening', () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}
startServer(currentPort);
export { app, httpServer, io }; // Export for testing
