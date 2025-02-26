let currentUser = { userId: null, username: null };
let socket;
let lastTypingTime;
let typingTimeout;

// Connect to Socket.IO after getting user info
async function initializeApp() {
    try {
        // Get user info from the server
        const response = await fetch('/api/user');
        currentUser = await response.json();
        
        // Update user info display
        document.getElementById('user-info').textContent = `Connected as: ${currentUser.username}`;
        
        // Connect to WebSocket server
        socket = io();
        
        // Send identification to server
        socket.on('connect', () => {
            socket.emit('identify', currentUser);
            appendMessage({
                type: 'system',
                message: 'Connected to server'
            });
        });
        
        socket.on('disconnect', () => {
            appendMessage({
                type: 'system',
                message: 'Disconnected from server'
            });
        });
        
        // Handle incoming messages
        socket.on('message', (data) => {
            appendMessage({
                type: data.userId === currentUser.userId ? 'self' : 'other',
                username: data.username,
                message: data.text,
                timestamp: new Date(data.timestamp)
            });
        });
        
        // Handle user joined notifications
        socket.on('user-joined', (data) => {
            appendMessage({
                type: 'system',
                message: data.message,
                timestamp: new Date(data.timestamp)
            });
        });
        
        // Handle user left notifications
        socket.on('user-left', (data) => {
            appendMessage({
                type: 'system',
                message: data.message,
                timestamp: new Date(data.timestamp)
            });
        });
        
        // Handle typing indicators (optional)
        socket.on('typing', (data) => {
            if (data.userId !== currentUser.userId) {
                document.getElementById('typing-indicator').textContent = `${data.username} is typing...`;
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    document.getElementById('typing-indicator').textContent = '';
                }, 3000);
            }
        });
        
    } catch (error) {
        console.error('Error initializing app:', error);
        appendMessage({
            type: 'system',
            message: 'Error connecting to server'
        });
    }
}

// Handle sending messages
function sendMessage(event) {
    event.preventDefault();
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (message && socket && socket.connected) {
        socket.emit('message', message);
        messageInput.value = '';
        document.getElementById('typing-indicator').textContent = '';
    }
}

// Handle typing indicator
function handleTyping() {
    if (!socket || !socket.connected) return;
    
    const now = new Date().getTime();
    
    // Only emit typing event if it's been more than 2 seconds since last typing
    if (!lastTypingTime || now - lastTypingTime > 2000) {
        socket.emit('typing', {
            userId: currentUser.userId,
            username: currentUser.username
        });
        lastTypingTime = now;
    }
}

// Append a message to the messages container
function appendMessage(data) {
    const messagesDiv = document.getElementById('messages');
    const messageElement = document.createElement('div');
    
    // Set message class based on type
    messageElement.className = `message message-${data.type}`;
    
    if (data.type === 'system') {
        messageElement.textContent = data.message;
    } else {
        // Create message metadata element (username and timestamp)
        const metaElement = document.createElement('div');
        metaElement.className = 'message-meta';
        
        if (data.username) {
            const usernameElement = document.createElement('span');
            usernameElement.className = 'message-username';
            usernameElement.textContent = data.username;
            metaElement.appendChild(usernameElement);
        }
        
        if (data.timestamp) {
            const timeElement = document.createElement('span');
            timeElement.className = 'message-time';
            timeElement.textContent = formatTime(data.timestamp);
            metaElement.appendChild(timeElement);
        }
        
        // Create message content
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        contentElement.textContent = data.message;
        
        // Add all elements to the message
        messageElement.appendChild(metaElement);
        messageElement.appendChild(contentElement);
    }
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Format a timestamp into a readable time
function formatTime(timestamp) {
    if (!(timestamp instanceof Date)) {
        timestamp = new Date(timestamp);
    }
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', initializeApp);
