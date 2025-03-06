/*
 * Test Runner Script for SyncDoc
 * 
 * This script runs the server and then executes the tests with proper environment setup.
 */

// Set the test environment
process.env.NODE_ENV = 'test';

const { spawn } = require('child_process');
const path = require('path');

// Define colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

console.log(`${colors.bright}${colors.blue}SyncDoc Test Runner${colors.reset}`);
console.log(`${colors.dim}------------------------------------------${colors.reset}`);

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all'; // Default to running all tests

console.log(`${colors.yellow}Starting test runner for: ${testType} tests${colors.reset}`);

// Kill any running Bun processes (in case of lingering test processes)
try {
  console.log(`${colors.dim}Cleaning up any existing test processes...${colors.reset}`);
  const cleanup = spawn('powershell', ['taskkill /F /IM bun.exe'], { shell: true });
  cleanup.on('error', (err) => {
    console.log(`${colors.dim}No cleanup needed (${err.message})${colors.reset}`);
  });
} catch (error) {
  console.log(`${colors.dim}Cleanup command failed: ${error.message}${colors.reset}`);
}

// Define test commands
const testCommands = {
  socket: 'bun test src/socket.test.ts',
  e2e: 'bun test e2e/editor.test.ts',
  all: 'bun test'
};

if (!testCommands[testType]) {
  console.error(`${colors.red}Unknown test type: ${testType}${colors.reset}`);
  console.log(`${colors.yellow}Available options: socket, e2e, all${colors.reset}`);
  process.exit(1);
}

// Start the server first
console.log(`${colors.green}Starting server in test mode...${colors.reset}`);
const server = spawn('bun', ['src/app.ts'], {
  env: { ...process.env, NODE_ENV: 'test' },
  stdio: 'pipe'
});

let serverOutput = '';

server.stdout.on('data', (data) => {
  serverOutput += data.toString();
  console.log(`${colors.dim}[Server] ${data.toString().trim()}${colors.reset}`);
});

server.stderr.on('data', (data) => {
  serverOutput += data.toString();
  console.error(`${colors.red}[Server Error] ${data.toString().trim()}${colors.reset}`);
});

// Wait for server to start
setTimeout(() => {
  // Check if server is running properly
  if (!serverOutput.includes('Socket.IO server running') || !serverOutput.includes('Express server running')) {
    console.error(`${colors.red}Server did not start correctly. Aborting tests.${colors.reset}`);
    console.error(`${colors.red}Server output: ${serverOutput}${colors.reset}`);
    server.kill();
    process.exit(1);
  }

  console.log(`${colors.green}Server started successfully. Running ${testType} tests...${colors.reset}`);
  console.log(`${colors.dim}------------------------------------------${colors.reset}`);

  // Run the tests
  const test = spawn('bun', testCommands[testType].split(' ').slice(1), {
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit',
    shell: true
  });

  test.on('exit', (code) => {
    console.log(`${colors.dim}------------------------------------------${colors.reset}`);
    if (code === 0) {
      console.log(`${colors.green}${colors.bright}Tests completed successfully!${colors.reset}`);
    } else {
      console.error(`${colors.red}${colors.bright}Tests failed with code ${code}${colors.reset}`);
    }
    
    // Clean up the server
    server.kill();
    process.exit(code);
  });

}, 3000); // Wait 3 seconds for server to start

// Handle script termination
process.on('SIGINT', () => {
  console.log(`${colors.yellow}Stopping test runner...${colors.reset}`);
  server.kill();
  process.exit();
});
