import { io } from 'socket.io-client';

// Function to create a test client
async function createTestClient(clientName) {
  console.log(`Creating test client: ${clientName}`);
  
  // Connect to the server
  const socket = io('http://localhost:3001');
  
  // Generate a test user ID
  const userId = Math.random().toString(36).substring(2, 8);
  const username = `TestUser-${clientName}-${userId.substring(0, 3)}`;
  
  // Setup connection handler
  socket.on('connect', () => {
    console.log(`${clientName} connected with ID: ${socket.id}`);
    
    // Identify user
    socket.emit('identify', { userId, username });
  });
  
  // Setup message handler
  socket.on('message', (data) => {
    console.log(`${clientName} received message:`, data);
  });
  
  // Setup disconnect handler
  socket.on('disconnect', () => {
    console.log(`${clientName} disconnected`);
  });
  
  return {
    socket,
    userId,
    username,
    sendMessage: (message) => {
      console.log(`${clientName} sending message: ${message}`);
      socket.emit('message', message);
    },
    sendTypingIndicator: () => {
      console.log(`${clientName} is typing...`);
      socket.emit('typing', { userId, username });
    },
    disconnect: () => socket.disconnect()
  };
}

// Main function to run tests
async function runTests() {
  console.log('Starting tests...');
  
  try {
    // Create two test clients
    const client1 = await createTestClient('Client1');
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send a message from client1
    client1.sendMessage('Hello from Client 1!');
    
    // Wait a bit before creating the second client
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const client2 = await createTestClient('Client2');
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send messages between clients
    client1.sendMessage('Hello from Client 1 to Client 2!');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test typing indicators
    client2.sendTypingIndicator();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    client2.sendMessage('Hello from Client 2 to Client 1!');
    
    // Wait for a while to see all messages
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Disconnect clients
    console.log('Test complete. Disconnecting clients...');
    client1.disconnect();
    client2.disconnect();
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests();
