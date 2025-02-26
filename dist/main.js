"use strict";
// State
let currentUser = { userId: null, username: null };
let socket; // Socket.io doesn't have good TypeScript support in the client
let lastTypingTime;
let typingTimeout;
// Connect to Socket.IO after getting user info
async function initializeApp() {
    console.log('Initializing app...');
    try {
        // Get user info from the server
        const response = await fetch('/api/user');
        currentUser = await response.json();
        console.log('User info:', currentUser);
        // Update user info display
        const userInfoElement = document.getElementById('user-info');
        if (userInfoElement) {
            userInfoElement.textContent = `Connected as: ${currentUser.username}`;
        }
        // Connect to WebSocket server - use window.location to adapt to any port
        socket = io(window.location.origin);
        console.log('Socket connection created');
        // Send identification to server
        socket.on('connect', () => {
            console.log('Socket connected');
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
            console.log('Received message:', data);
            appendMessage({
                type: data.userId === currentUser.userId ? 'self' : 'other',
                username: data.username,
                message: data.text,
                timestamp: new Date(data.timestamp)
            });
        });
        // Handle user joined notifications
        socket.on('user-joined', (data) => {
            console.log('User joined:', data);
            appendMessage({
                type: 'system',
                message: data.message,
                timestamp: new Date(data.timestamp)
            });
        });
        // Handle user left notifications
        socket.on('user-left', (data) => {
            console.log('User left:', data);
            appendMessage({
                type: 'system',
                message: data.message,
                timestamp: new Date(data.timestamp)
            });
        });
        // Handle typing indicators
        socket.on('typing', (data) => {
            if (data.userId !== currentUser.userId) {
                const typingIndicator = document.getElementById('typing-indicator');
                if (typingIndicator) {
                    typingIndicator.textContent = `${data.username} is typing...`;
                    clearTimeout(typingTimeout);
                    typingTimeout = setTimeout(() => {
                        if (typingIndicator) {
                            typingIndicator.textContent = '';
                        }
                    }, 3000);
                }
            }
        });
        // Set up form submission event
        const messageForm = document.getElementById('message-form');
        if (messageForm) {
            messageForm.addEventListener('submit', sendMessage);
        }
        // Set up typing event
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keydown', handleTyping);
        }
    }
    catch (error) {
        console.error('Error initializing app:', error);
        appendMessage({
            type: 'system',
            message: 'Error connecting to server: ' + (error instanceof Error ? error.message : String(error))
        });
    }
}
// Handle sending messages
function sendMessage(event) {
    event.preventDefault();
    const messageInput = document.getElementById('message-input');
    if (!messageInput || !messageInput.value.trim())
        return;
    if (socket && socket.connected) {
        // Send message to server
        socket.emit('message', messageInput.value);
        // Clear input field
        messageInput.value = '';
        messageInput.focus();
    }
    else {
        appendMessage({
            type: 'system',
            message: 'Cannot send message: not connected to server'
        });
    }
}
// Handle typing indicator
function handleTyping() {
    if (!socket || !socket.connected || !currentUser.userId)
        return;
    const now = new Date().getTime();
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
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer)
        return;
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${data.type}`;
    let messageHTML = '';
    if (data.type !== 'system') {
        // Add username and timestamp for normal messages
        messageHTML += '<div class="message-meta">';
        messageHTML += `<span class="message-username">${data.username || 'Unknown'}</span>`;
        if (data.timestamp) {
            messageHTML += `<span class="message-time">${formatTime(data.timestamp)}</span>`;
        }
        messageHTML += '</div>';
    }
    // Add message content
    messageHTML += `<div class="message-content">${data.message}</div>`;
    messageElement.innerHTML = messageHTML;
    messagesContainer.appendChild(messageElement);
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
// Format a timestamp into a readable time
function formatTime(timestamp) {
    return timestamp.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}
// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded');
    initializeApp();
});
