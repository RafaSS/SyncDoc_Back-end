// Types
interface User {
  userId: string | null;
  username: string | null;
}

interface MessageData {
  id?: string;
  userId?: string;
  username?: string;
  text?: string;
  message?: string;
  timestamp?: string;
  type?: 'self' | 'other' | 'system';
}

// State
let currentUser: User = { userId: null, username: null };
let socket: any; // Socket.io doesn't have good TypeScript support in the client
let lastTypingTime = 0;
let typingTimeout: ReturnType<typeof setTimeout>;

// Connect to Socket.IO after getting user info
async function initializeApp(): Promise<void> {
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
    
    socket.on('user-joined', (data: MessageData) => {
      appendMessage({
        type: 'system',
        message: data.message || 'A user has joined'
      });
    });
    
    socket.on('user-left', (data: MessageData) => {
      appendMessage({
        type: 'system',
        message: data.message || 'A user has left'
      });
    });
    
    // Handle incoming messages
    socket.on('message', (data: MessageData) => {
      console.log('Received message:', data);
      
      // Check if this is a message from the current user
      const messageType = data.userId === currentUser.userId ? 'self' : 'other';
      
      appendMessage({
        type: messageType,
        username: data.username,
        message: data.text || '',
        timestamp: data.timestamp
      });
    });
    
    // Handle typing indicators
    socket.on('typing', (data: { username: string; isTyping: boolean }) => {
      const typingIndicator = document.getElementById('typing-indicator');
      if (!typingIndicator) return;
      
      if (data.isTyping) {
        typingIndicator.textContent = `${data.username} is typing...`;
        typingIndicator.classList.remove('hidden');
      } else {
        typingIndicator.classList.add('hidden');
      }
    });
    
    // Set up form submission handler
    const messageForm = document.getElementById('message-form') as HTMLFormElement;
    if (messageForm) {
      messageForm.addEventListener('submit', sendMessage);
    }
    
    // Set up typing indicator
    const messageInput = document.getElementById('message-input') as HTMLInputElement;
    if (messageInput) {
      messageInput.addEventListener('input', handleTyping);
    }
    
  } catch (error) {
    console.error('Error initializing app:', error);
    appendMessage({
      type: 'system',
      message: 'Failed to connect to server'
    });
  }
}

// Handle sending messages
function sendMessage(event: Event): void {
  event.preventDefault();
  
  const input = document.getElementById('message-input') as HTMLInputElement;
  const message = input.value.trim();
  
  if (message) {
    // Send message to server
    socket.emit('message', message);
    
    // Clear input
    input.value = '';
    
    // Stop typing indicator
    socket.emit('typing', { 
      username: currentUser.username,
      isTyping: false 
    });
  }
}

// Handle typing indicator
function handleTyping(): void {
  if (!socket) return;
  
  // If user is typing, send the "typing" event
  const now = Date.now();
  if (!lastTypingTime || now - lastTypingTime > 3000) {
    socket.emit('typing', { 
      username: currentUser.username,
      isTyping: true 
    });
    lastTypingTime = now;
  }
  
  // Clear previous timeout
  clearTimeout(typingTimeout);
  
  // Set a timeout to stop typing indicator after 3 seconds of inactivity
  typingTimeout = setTimeout(() => {
    socket.emit('typing', { 
      username: currentUser.username,
      isTyping: false 
    });
  }, 3000);
}

// Append a message to the messages container
function appendMessage(data: MessageData): void {
  const messagesContainer = document.getElementById('messages');
  if (!messagesContainer) return;
  
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  
  // Add appropriate classes based on message type
  if (data.type === 'self') {
    messageElement.classList.add('self-message');
  } else if (data.type === 'other') {
    messageElement.classList.add('other-message');
  } else if (data.type === 'system') {
    messageElement.classList.add('system-message');
  }
  
  let messageContent = '';
  
  if (data.type === 'system') {
    messageContent = `<div class="message-content">${data.message}</div>`;
  } else {
    let timeDisplay = '';
    if (data.timestamp) {
      const messageDate = new Date(data.timestamp);
      timeDisplay = `<span class="message-time">${formatTime(messageDate)}</span>`;
    }
    
    const usernameDisplay = data.type === 'other' && data.username 
      ? `<div class="message-username">${data.username}</div>` 
      : '';
    
    messageContent = `
      ${usernameDisplay}
      <div class="message-content">${data.message}</div>
      ${timeDisplay}
    `;
  }
  
  messageElement.innerHTML = messageContent;
  messagesContainer.appendChild(messageElement);
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Format a timestamp into a readable time
function formatTime(timestamp: Date): string {
  return timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  initializeApp();
});
