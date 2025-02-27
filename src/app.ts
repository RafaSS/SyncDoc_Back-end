import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3000;

// Create Socket.IO server with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.static(path.join(__dirname, '../public')));

// In-memory document store - in a production app, you'd use a database
const documents: Record<string, { content: string, users: Record<string, string> }> = {
  'welcome': {
    content: 'Welcome to SyncDoc! This is a collaborative document editor.',
    users: {}
  }
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);
  
  // Handle joining a document
  socket.on('join-document', (documentId: string, userId: string) => {
    // If the document doesn't exist, create it
    if (!documents[documentId]) {
      documents[documentId] = {
        content: '',
        users: {}
      };
    }
    
    // Add user to the document
    documents[documentId].users[socket.id] = userId || 'Anonymous';
    
    // Join the document room
    socket.join(documentId);
    
    // Send the current document content to the user
    socket.emit('load-document', documents[documentId].content);
    
    // Notify others that a user has joined
    io.to(documentId).emit('user-joined', socket.id, documents[documentId].users[socket.id]);
    
    // Send the list of users in the document
    io.to(documentId).emit('user-list', documents[documentId].users);
    
    console.log(`User ${documents[documentId].users[socket.id]} joined document ${documentId}`);
  });
  
  // Handle text changes
  socket.on('text-change', (documentId: string, delta: any, source: string) => {
    if (source !== 'user') return;
    
    // Update the document content
    documents[documentId].content = delta;
    
    // Broadcast the change to all other clients in the room
    socket.to(documentId).emit('text-change', delta, socket.id);
    
    console.log(`Document ${documentId} updated by ${documents[documentId]?.users[socket.id] || 'unknown user'}`);
  });
  
  // Handle cursor movement
  socket.on('cursor-move', (documentId: string, cursorPosition: any) => {
    // Broadcast the cursor position to all other clients in the room
    socket.to(documentId).emit('cursor-move', socket.id, cursorPosition);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove user from all documents
    Object.keys(documents).forEach(documentId => {
      if (documents[documentId].users[socket.id]) {
        const userName = documents[documentId].users[socket.id];
        delete documents[documentId].users[socket.id];
        
        // Notify others that a user has left
        io.to(documentId).emit('user-left', socket.id, userName);
        
        // Update the user list
        io.to(documentId).emit('user-list', documents[documentId].users);
        
        console.log(`User ${userName} left document ${documentId}`);
      }
    });
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/api/documents', (req, res) => {
  const documentList = Object.keys(documents).map(id => ({
    id,
    userCount: Object.keys(documents[id].users).length
  }));
  
  res.json(documentList);
});

app.post('/api/documents', (req, res) => {
  const id = uuidv4();
  documents[id] = {
    content: '',
    users: {}
  };
  
  res.json({ id });
});

// Start the server
httpServer.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

export { app, httpServer };
