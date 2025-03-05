document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const editor = document.getElementById('editor');
    const documentTitle = document.getElementById('document-title');
    const connectionStatus = document.getElementById('connection-status');
    const userStatus = document.getElementById('user-status');
    const userListButton = document.getElementById('user-list-button');
    const userList = document.getElementById('user-list');
    const userListContent = document.querySelector('.user-list-content');
    const newDocButton = document.getElementById('new-doc-btn');
    const shareButton = document.getElementById('share-btn');
    const shareModal = document.getElementById('share-modal');
    const closeModalButton = document.querySelector('.close');
    const shareLink = document.getElementById('share-link');
    const copyLinkButton = document.getElementById('copy-link-btn');

    // State variables
    let socket;
    let quill;
    let currentDocumentId;
    let userId;
    let userColors = {};
    let cursors = {};

    // Random user ID if not stored
    userId = localStorage.getItem('userId') || generateUserId();
    localStorage.setItem('userId', userId);

    // Initialize the editor
    function initializeEditor() {
        // Initialize Quill editor
        quill = new Quill('#editor', {
            theme: 'snow',
            modules: {
                toolbar: '#toolbar'
            },
            placeholder: 'Start typing...'
        });

        // Connect to Socket.IO server
        socket = io('http://localhost:3000');

        // Socket event handlers
        setupSocketHandlers();

        // Get document ID from URL or create a new one
        const urlParams = new URLSearchParams(window.location.search);
        currentDocumentId = urlParams.get('doc') || 'welcome';

        // Update URL with document ID
        updateURL(currentDocumentId);

        // Join the document
        joinDocument(currentDocumentId);

        // Set up event listeners
        setupEventListeners();
    }

    // Set up Socket.IO event handlers
    function setupSocketHandlers() {
        socket.on('connect', () => {
            connectionStatus.textContent = 'Connected';
            connectionStatus.style.color = '#4CAF50';
            
            // Rejoin document if we were previously connected
            if (currentDocumentId) {
                joinDocument(currentDocumentId);
            }
        });

        socket.on('disconnect', () => {
            connectionStatus.textContent = 'Disconnected';
            connectionStatus.style.color = '#f44336';
        });

        socket.on('load-document', (content) => {
            quill.setContents(content ? JSON.parse(content) : { ops: [] });
            quill.enable();
        });

        socket.on('text-change', (delta, userId) => {
            console.log('Text change', JSON.parse(delta), userId);
            quill.updateContents(delta);
        });

        socket.on('user-joined', (socketId, userName) => {
            // Assign a random color to the user
            if (!userColors[socketId]) {
                userColors[socketId] = getRandomColor();
            }
            
            // Update user list
            updateUserList();
            
            // Show notification
            showNotification(`${userName} joined`);
        });

        socket.on('user-left', (socketId, userName) => {
            // Remove user cursor
            if (cursors[socketId]) {
                cursors[socketId].remove();
                delete cursors[socketId];
            }
            
            // Update user list
            updateUserList();
            
            // Show notification
            showNotification(`${userName} left`);
        });

        socket.on('user-list', (users) => {
            // Update the user list dropdown
            updateUserListDropdown(users);
        });

        socket.on('cursor-move', (socketId, cursorPosition) => {
            updateRemoteCursor(socketId, cursorPosition);
        });
    }

    // Set up event listeners
    function setupEventListeners() {
        // Handle text changes
        quill.on('text-change', (delta, oldDelta, source) => {
            if (source === 'user') {
                console.log('Text change', delta, oldDelta, source);
                const contents = JSON.stringify(quill.getContents());
                socket.emit('text-change', currentDocumentId, contents, source);
            }
        });

        // Handle selection changes (cursor movement)
        quill.on('selection-change', (range, oldRange, source) => {
            if (source === 'user' && range) {
                socket.emit('cursor-move', currentDocumentId, range);
            }
        });

        // Toggle user list dropdown
        userListButton.addEventListener('click', () => {
            userList.style.display = userList.style.display === 'block' ? 'none' : 'block';
        });

        // Hide user list when clicking outside
        document.addEventListener('click', (event) => {
            if (!userListButton.contains(event.target) && !userList.contains(event.target)) {
                userList.style.display = 'none';
            }
        });

        // New document button
        newDocButton.addEventListener('click', createNewDocument);

        // Share button
        shareButton.addEventListener('click', () => {
            shareLink.value = window.location.href;
            shareModal.style.display = 'block';
        });

        // Close modal
        closeModalButton.addEventListener('click', () => {
            shareModal.style.display = 'none';
        });

        // Copy link button
        copyLinkButton.addEventListener('click', () => {
            shareLink.select();
            document.execCommand('copy');
            copyLinkButton.textContent = 'Copied!';
            setTimeout(() => {
                copyLinkButton.textContent = 'Copy';
            }, 2000);
        });

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === shareModal) {
                shareModal.style.display = 'none';
            }
        });

        // Document title change
        documentTitle.addEventListener('change', () => {
            // In a real app, you'd save the title to the server
            document.title = `${documentTitle.value} - SyncDoc`;
        });
    }

    // Join a document
    function joinDocument(documentId) {
        currentDocumentId = documentId;
        socket.emit('join-document', documentId, userId);
        quill.enable(false); // Disable editor until document loads
        userStatus.textContent = `Editing: ${documentId}`;
    }

    // Create a new document
    function createNewDocument() {
        fetch('/api/documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            const newDocId = data.id;
            // Navigate to the new document
            window.location.href = `/?doc=${newDocId}`;
        })
        .catch(error => {
            console.error('Error creating new document:', error);
            alert('Failed to create a new document');
        });
    }

    // Update URL with document ID
    function updateURL(documentId) {
        const url = new URL(window.location);
        url.searchParams.set('doc', documentId);
        window.history.pushState({}, '', url);
    }

    // Update user list dropdown
    function updateUserListDropdown(users) {
        userListContent.innerHTML = '';
        const userCount = Object.keys(users).length;
        userListButton.textContent = `Collaborators (${userCount})`;

        // Add user items to the dropdown
        Object.entries(users).forEach(([socketId, userName]) => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            
            const userColor = document.createElement('div');
            userColor.className = 'user-color';
            userColor.style.backgroundColor = userColors[socketId] || getRandomColor();
            
            const userNameSpan = document.createElement('span');
            userNameSpan.textContent = socketId === socket.id ? `${userName} (You)` : userName;
            
            userItem.appendChild(userColor);
            userItem.appendChild(userNameSpan);
            userListContent.appendChild(userItem);
            
            // Ensure we have a color for this user
            if (!userColors[socketId]) {
                userColors[socketId] = userColor.style.backgroundColor;
            }
        });
    }

    // Update remote cursor
    function updateRemoteCursor(socketId, range) {
        // Remove old cursor
        if (cursors[socketId]) {
            cursors[socketId].remove();
        }
        
        // Don't show cursor for our own changes
        if (socketId === socket.id) return;
        
        // Create cursor element
        const cursorElement = document.createElement('div');
        cursorElement.className = 'ql-cursor';
        cursorElement.innerHTML = `
            <div class="ql-cursor-caret" style="background-color: ${userColors[socketId] || getRandomColor()}"></div>
            <div class="ql-cursor-name" style="background-color: ${userColors[socketId] || getRandomColor()}">
                ${document.querySelector(`.user-item:nth-child(${Object.keys(userColors).indexOf(socketId) + 1}) span`)?.textContent || 'User'}
            </div>
        `;
        
        // Position cursor
        const bounds = quill.getBounds(range.index);
        cursorElement.style.top = bounds.top + 'px';
        cursorElement.style.left = bounds.left + 'px';
        cursorElement.style.height = bounds.height + 'px';
        
        // Add cursor to editor
        quill.container.appendChild(cursorElement);
        cursors[socketId] = cursorElement;
    }

    // Show a notification
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = '#333';
        notification.style.color = '#fff';
        notification.style.padding = '10px 15px';
        notification.style.borderRadius = '4px';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 100);
        
        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Helper function to update the user list UI
    function updateUserList() {
        // This would be called when users join or leave
        // The actual implementation happens in the updateUserListDropdown function
        // when the server sends the updated user list
    }

    // Generate a random user ID
    function generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    // Get a random color for user cursor
    function getRandomColor() {
        const colors = [
            '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
            '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
            '#8bc34a', '#cddc39', '#ffc107', '#ff9800', '#ff5722'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Initialize the application
    initializeEditor();
});
