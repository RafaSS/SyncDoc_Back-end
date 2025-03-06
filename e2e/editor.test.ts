import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import puppeteer, { Browser, Page } from 'puppeteer';
import { 
  socketPort, 
  expressPort, 
  startServer, 
  startExpressServer,
  server as socketServer,
  io,
  expressApp
} from '../src/app';
import fs from 'node:fs';
import path from 'node:path';

// Configure test timeouts and retry settings
const DEFAULT_TIMEOUT = 60000; // 60 seconds
const DEFAULT_NAVIGATION_TIMEOUT = 90000; // 90 seconds
const SELECTOR_TIMEOUT = 30000; // 30 seconds
const TEST_TIMEOUT = 30000; // 30 seconds for test runner timeout

// Create a minimal HTML page for testing if we can't find the frontend
const TEST_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>SyncDoc Test</title>
  <script src="https://cdn.socket.io/4.6.0/socket.io.min.js"></script>
  <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
  <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
  <style>
    .ql-editor { height: 300px; }
    .editor-container { margin: 20px; }
    #user-list { margin: 20px; }
  </style>
</head>
<body>
  <div id="app">
    <div class="editor-container">
      <div id="editor"></div>
    </div>
    <div id="user-list"></div>
  </div>
  <script>
    const socket = io('http://localhost:${socketPort}');
    const quill = new Quill('#editor', {
      theme: 'snow'
    });
    
    // Generate a consistent document ID for testing
    const documentId = 'test-document-123';
    const userName = 'Test User ' + Math.floor(Math.random() * 100);
    
    // Join document
    socket.emit('join-document', documentId, userName);
    
    // Listen for text changes from the editor
    quill.on('text-change', function(delta, oldDelta, source) {
      if (source === 'user') {
        socket.emit('text-change', documentId, delta, source, quill.root.innerHTML);
        console.log('Text change emitted:', delta);
      }
    });
    
    // Listen for text changes from the server
    socket.on('text-change', function(delta) {
      quill.updateContents(delta);
      console.log('Text change received:', delta);
    });
    
    // Listen for user list updates
    socket.on('user-list', function(users) {
      const userList = document.getElementById('user-list');
      userList.innerHTML = '<h3>Connected Users:</h3>';
      Object.values(users).forEach(user => {
        const userItem = document.createElement('div');
        userItem.textContent = user;
        userList.appendChild(userItem);
      });
      console.log('Updated user list:', users);
    });

    // Debug events
    socket.on('connect', () => {
      console.log('Socket connected with ID:', socket.id);
    });
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    // Debug function to inspect document state
    window.getDocumentText = function() {
      return quill.root.innerHTML;
    };
  </script>
</body>
</html>
`;

describe('SyncDoc E2E Tests', () => {
  let browser: Browser;
  let pageA: Page;
  let pageB: Page;
  const BASE_URL = `http://localhost:${expressPort}`;
  let testHtmlCreated = false;
  
  // Create a test HTML file if needed
  const createTestHtml = () => {
    const testDir = path.join(process.cwd(), 'e2e/test-html');
    const testHtmlPath = path.join(testDir, 'test.html');
    
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    fs.writeFileSync(testHtmlPath, TEST_HTML);
    console.log(`Created test HTML at ${testHtmlPath}`);
    
    // Serve the test HTML file
    expressApp.get('/test', (req, res) => {
      res.sendFile(testHtmlPath);
    });
    
    testHtmlCreated = true;
    return '/test';
  };
  
  beforeAll(async () => {
    console.log('Starting E2E test environment...');
    console.log(`Using express server URL: ${BASE_URL}`);
    console.log(`Backend running on express port: ${expressPort}, socket port: ${socketPort}`);
    
    // Ensure servers are running
    startServer();
    startExpressServer();
    
    // Create test HTML file and route
    const testRoute = createTestHtml();
    console.log(`Test route available at: ${BASE_URL}${testRoute}`);
    
    console.log('Servers started, launching browser...');
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials'
        ],
        defaultViewport: { width: 1280, height: 800 },
        protocolTimeout: 60000 // 60 seconds protocol timeout
      });
      console.log('Browser launched successfully');
    } catch (error) {
      console.error('Failed to launch browser:', error);
      throw error;
    }
  });

  afterAll(async () => {
    console.log('Closing browser and shutting down servers...');
    await browser.close().catch(err => console.error('Error closing browser:', err));
  });

  // Basic test - just check if the editor loads
  test('should load the editor', async () => {
    // Set up browser pages
    pageA = await browser.newPage();
    pageA.setDefaultTimeout(DEFAULT_TIMEOUT);
    pageA.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT);
    
    try {
      console.log('Running editor load test...');
      
      // Navigate to test page
      const testUrl = `${BASE_URL}/test`;
      console.log(`Navigating to ${testUrl}`);
      await pageA.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: DEFAULT_NAVIGATION_TIMEOUT });
      
      // Wait for editor to load
      await pageA.waitForSelector('.ql-editor', { timeout: SELECTOR_TIMEOUT });
      
      // Verify editor exists
      const editorA = await pageA.$('.ql-editor');
      expect(editorA).not.toBeNull();
      console.log('Editor load test passed');
    } catch (err) {
      console.error('Editor load test failed:', err);
      await pageA.screenshot({ path: 'error-load-test.png' }).catch(() => {});
      throw err;
    } finally {
      // Clean up
      if (pageA && !pageA.isClosed()) await pageA.close().catch(err => console.error('Error closing page:', err));
    }
  }, TEST_TIMEOUT);

  // Test that content syncs between two editors
  test('should show the same content in both editors', async () => {
    // Set up browser pages
    pageA = await browser.newPage();
    pageB = await browser.newPage();
    
    // Configure pages
    pageA.setDefaultTimeout(DEFAULT_TIMEOUT);
    pageB.setDefaultTimeout(DEFAULT_TIMEOUT);
    pageA.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT);
    pageB.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT);
    
    // Enable logging
    pageA.on('console', msg => console.log('Page A Console:', msg.text()));
    pageB.on('console', msg => console.log('Page B Console:', msg.text()));
    
    try {
      console.log('Running content sync test...');
      
      // Navigate to test pages
      const testUrl = `${BASE_URL}/test`;
      console.log(`Navigating both pages to ${testUrl}`);
      
      await Promise.all([
        pageA.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: DEFAULT_NAVIGATION_TIMEOUT }),
        pageB.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: DEFAULT_NAVIGATION_TIMEOUT })
      ]);
      
      // Wait for editors to load
      console.log('Waiting for editors to load...');
      await Promise.all([
        pageA.waitForSelector('.ql-editor', { timeout: SELECTOR_TIMEOUT }),
        pageB.waitForSelector('.ql-editor', { timeout: SELECTOR_TIMEOUT })
      ]);
      
      // Give time for socket connections to establish
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Type text in page A
      console.log('Typing text in editor A...');
      await pageA.focus('.ql-editor');
      await pageA.keyboard.type('Hello from E2E test');
      
      // Wait for content to sync (now with more detailed checks)
      console.log('Waiting for text to sync to editor B...');
      let synced = false;
      
      // Poll for up to 10 seconds to check if content synced
      for (let i = 0; i < 10; i++) {
        try {
          const content = await pageB.evaluate(() => {
            return document.querySelector('.ql-editor')?.textContent || '';
          });
          
          console.log(`Content in editor B (attempt ${i+1}):`, content);
          
          if (content.includes('Hello from E2E test')) {
            synced = true;
            break;
          }
        } catch (err) {
          console.error(`Error checking sync (attempt ${i+1}):`, err);
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (!synced) {
        // Take screenshots for debugging
        await pageA.screenshot({ path: 'sync-error-pageA.png' }).catch(() => {});
        await pageB.screenshot({ path: 'sync-error-pageB.png' }).catch(() => {});
        throw new Error('Content did not sync within the expected time');
      }
      
      // Final verification
      const textContent = await pageB.evaluate(() => {
        return document.querySelector('.ql-editor')?.textContent || '';
      });
      
      expect(textContent).toContain('Hello from E2E test');
      console.log('Content sync test passed');
    } catch (err) {
      console.error('Content sync test failed:', err);
      await pageA.screenshot({ path: 'sync-error-pageA.png' }).catch(() => {});
      await pageB.screenshot({ path: 'sync-error-pageB.png' }).catch(() => {});
      throw err;
    } finally {
      // Clean up
      if (pageA && !pageA.isClosed()) await pageA.close().catch(err => console.error('Error closing pageA:', err));
      if (pageB && !pageB.isClosed()) await pageB.close().catch(err => console.error('Error closing pageB:', err));
    }
  }, TEST_TIMEOUT);
});
