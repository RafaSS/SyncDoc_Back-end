document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const editor = document.getElementById("editor");
  const documentTitle = document.getElementById("document-title");
  const connectionStatus = document.getElementById("connection-status");
  const userStatus = document.getElementById("user-status");
  const userListButton = document.getElementById("user-list-button");
  const userList = document.getElementById("user-list");
  const userListContent = document.querySelector(".user-list-content");
  const newDocButton = document.getElementById("new-doc-btn");
  const shareButton = document.getElementById("share-btn");
  const shareModal = document.getElementById("share-modal");
  const closeModalButton = document.querySelector(".close");
  const shareLink = document.getElementById("share-link");
  const copyLinkButton = document.getElementById("copy-link-btn");

  // Get configuration from window.SYNCDOC_CONFIG (set in config.js)
  const API_BASE_URL =
    window.SYNCDOC_CONFIG?.API_BASE_URL || "http://localhost:3000/api";
  const SOCKET_URL =
    window.SYNCDOC_CONFIG?.SOCKET_URL || "http://localhost:3000";

  // State variables
  let socket;
  let quill;
  let currentDocumentId;
  let userId;
  let userColors = {};
  let cursors = {};
  let documentHistory = []; // Store document history

  // Random user ID if not stored
  userId = localStorage.getItem("userId") || generateUserId();
  localStorage.setItem("userId", userId);

  // Initialize the editor
  function initializeEditor() {
    // Initialize Quill editor
    quill = new Quill("#editor", {
      theme: "snow",
      modules: {
        toolbar: "#toolbar",
      },
      placeholder: "Start typing...",
    });

    // Backend API URLs

    // Connect to Socket.IO server
    socket = io(SOCKET_URL);

    // Socket event handlers
    setupSocketHandlers();

    // Add history button to toolbar
    addHistoryButton();

    // Get document ID from URL or create a new one
    const urlParams = new URLSearchParams(window.location.search);
    currentDocumentId = urlParams.get("doc") || "welcome";

    // Update URL with document ID
    updateURL(currentDocumentId);

    // Join the document
    joinDocument(currentDocumentId);

    // Set up event listeners
    setupEventListeners();
    document.title = `${documentTitle.value} - SyncDoc`;
  }

  // Set up Socket.IO event handlers
  function setupSocketHandlers() {
    socket.on("connect", () => {
      connectionStatus.textContent = "Connected";
      connectionStatus.style.color = "#4CAF50";

      // Rejoin document if we were previously connected
      if (currentDocumentId) {
        joinDocument(currentDocumentId);
      }
    });

    socket.on("disconnect", () => {
      connectionStatus.textContent = "Disconnected";
      connectionStatus.style.color = "#f44336";
    });

    socket.on("load-document", (content) => {
      quill.setContents(content ? JSON.parse(content) : { ops: [] });
      quill.enable();
    });

    socket.on("text-change", (delta, userId, content) => {
      console.log("Received delta:", delta);
      // Apply the delta directly without parsing
      quill.updateContents(delta);

      // Optionally fetch updated history for the document
      fetchDocumentHistory();
    });

    socket.on("user-joined", (socketId, userName) => {
      // Assign a random color to the user
      if (!userColors[socketId]) {
        userColors[socketId] = getRandomColor();
      }

      // Update user list
      updateUserList();

      // Show notification
      showNotification(`${userName} joined`);
    });

    socket.on("title-change", (title) => {
      documentTitle.value = title;
      document.title = `${documentTitle.value} - SyncDoc`;
    });

    socket.on("user-left", (socketId, userName) => {
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

    socket.on("user-list", (users) => {
      // Update the user list dropdown
      updateUserListDropdown(users);
    });

    socket.on("cursor-move", (socketId, cursorPosition) => {
      updateRemoteCursor(socketId, cursorPosition);
    });
  }

  // Set up event listeners
  function setupEventListeners() {
    // Handle text changes
    quill.on("text-change", (delta, oldDelta, source) => {
      if (source === "user") {
        console.log("Sending delta:", delta);
        const contents = JSON.stringify(quill.getContents());
        socket.emit("text-change", currentDocumentId, delta, source, contents);
      }
    });

    // Handle selection changes (cursor movement)
    quill.on("selection-change", (range, oldRange, source) => {
      if (source === "user" && range) {
        socket.emit("cursor-move", currentDocumentId, range);
      }
    });

    // Toggle user list dropdown
    userListButton.addEventListener("click", () => {
      userList.style.display =
        userList.style.display === "block" ? "none" : "block";
    });

    // Hide user list when clicking outside
    document.addEventListener("click", (event) => {
      if (
        !userListButton.contains(event.target) &&
        !userList.contains(event.target)
      ) {
        userList.style.display = "none";
      }
    });

    // New document button
    newDocButton.addEventListener("click", createNewDocument);

    // Share button
    shareButton.addEventListener("click", () => {
      shareLink.value = window.location.href;
      shareModal.style.display = "block";
    });

    // Close modal
    closeModalButton.addEventListener("click", () => {
      shareModal.style.display = "none";
    });

    // Copy link button
    copyLinkButton.addEventListener("click", () => {
      shareLink.select();
      document.execCommand("copy");
      copyLinkButton.textContent = "Copied!";
      setTimeout(() => {
        copyLinkButton.textContent = "Copy";
      }, 2000);
    });

    // Close modal when clicking outside
    window.addEventListener("click", (event) => {
      if (event.target === shareModal) {
        shareModal.style.display = "none";
      }
    });

    // Document title change
    documentTitle.addEventListener("change", () => {
      // In a real app, you'd save the title to the server
      socket.emit("title-change", currentDocumentId, documentTitle.value);
      document.title = `${documentTitle.value} - SyncDoc`;
    });
  }

  // Join a document
  function joinDocument(documentId) {
    currentDocumentId = documentId;
    socket.emit("join-document", documentId, userId);
    quill.enable(false); // Disable editor until document loads
    userStatus.textContent = `Editing: ${documentId}`;
    document.title = `${documentTitle.value} - SyncDoc`;
  }

  // Create a new document
  function createNewDocument() {
    fetch(`${API_BASE_URL}/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.id) {
          currentDocumentId = data.id;
          updateURL(currentDocumentId);
          joinDocument(currentDocumentId);
          documentTitle.value = "Untitled Document";
          socket.emit("title-change", currentDocumentId, "Untitled Document");
        }
      })
      .catch((error) => {
        console.error("Error creating new document:", error);
      });
  }

  // Update URL with document ID
  function updateURL(documentId) {
    const url = new URL(window.location);
    url.searchParams.set("doc", documentId);
    window.history.pushState({}, "", url);
  }

  // Update user list dropdown
  function updateUserListDropdown(users) {
    userListContent.innerHTML = "";
    const userCount = Object.keys(users).length;
    userListButton.textContent = `Collaborators (${userCount})`;

    // Add user items to the dropdown
    Object.entries(users).forEach(([socketId, userName]) => {
      const userItem = document.createElement("div");
      userItem.className = "user-item";

      const userColor = document.createElement("div");
      userColor.className = "user-color";
      userColor.style.backgroundColor =
        userColors[socketId] || getRandomColor();

      const userNameSpan = document.createElement("span");
      userNameSpan.textContent =
        socketId === socket.id ? `${userName} (You)` : userName;

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
    const cursorElement = document.createElement("div");
    cursorElement.className = "ql-cursor";
    cursorElement.innerHTML = `
            <div class="ql-cursor-caret" style="background-color: ${
              userColors[socketId] || getRandomColor()
            }"></div>
            <div class="ql-cursor-name" style="background-color: ${
              userColors[socketId] || getRandomColor()
            }">
                ${
                  document.querySelector(
                    `.user-item:nth-child(${
                      Object.keys(userColors).indexOf(socketId) + 1
                    }) span`
                  )?.textContent || "User"
                }
            </div>
        `;

    // Position cursor
    const bounds = quill.getBounds(range.index);
    cursorElement.style.top = bounds.top + "px";
    cursorElement.style.left = bounds.left + "px";
    cursorElement.style.height = bounds.height + "px";

    // Add cursor to editor
    quill.container.appendChild(cursorElement);
    cursors[socketId] = cursorElement;
  }

  // Show a notification
  function showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;
    notification.style.position = "fixed";
    notification.style.bottom = "20px";
    notification.style.right = "20px";
    notification.style.backgroundColor = "#333";
    notification.style.color = "#fff";
    notification.style.padding = "10px 15px";
    notification.style.borderRadius = "4px";
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.3s";

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.style.opacity = "1";
    }, 100);

    // Hide notification after 3 seconds
    setTimeout(() => {
      notification.style.opacity = "0";
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
    return "user_" + Math.random().toString(36).substr(2, 9);
  }

  // Get a random color for user cursor
  function getRandomColor() {
    const colors = [
      "#f44336",
      "#e91e63",
      "#9c27b0",
      "#673ab7",
      "#3f51b5",
      "#2196f3",
      "#03a9f4",
      "#00bcd4",
      "#009688",
      "#4caf50",
      "#8bc34a",
      "#cddc39",
      "#ffc107",
      "#ff9800",
      "#ff5722",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Add history button to the toolbar
  function addHistoryButton() {
    const toolbar = document.querySelector(".ql-toolbar");
    if (!toolbar) return;

    const historyButton = document.createElement("button");
    historyButton.className = "ql-history";
    historyButton.innerHTML = '<i class="fas fa-history"></i>';
    historyButton.title = "View document history";
    historyButton.addEventListener("click", showHistoryPanel);

    toolbar.appendChild(historyButton);
  }

  // Show history panel with all document changes
  function showHistoryPanel() {
    // Create history panel if it doesn't exist
    let historyPanel = document.getElementById("history-panel");

    if (!historyPanel) {
      historyPanel = document.createElement("div");
      historyPanel.id = "history-panel";
      historyPanel.className = "history-panel";
      historyPanel.innerHTML = `
                <div class="history-header">
                    <h3>Document History</h3>
                    <button class="close-history">&times;</button>
                </div>
                <div class="history-content"></div>
            `;
      document.body.appendChild(historyPanel);

      // Add close button event
      historyPanel
        .querySelector(".close-history")
        .addEventListener("click", () => {
          historyPanel.style.display = "none";
        });
    }

    // Show the panel
    historyPanel.style.display = "block";

    // Fetch and display history
    fetchDocumentHistory();
  }

  // Fetch document history from the server
  function fetchDocumentHistory() {
    if (!currentDocumentId) return;

    fetch(`${API_BASE_URL}/documents/${currentDocumentId}/history`)
      .then((response) => response.json())
      .then((data) => {
        documentHistory = data.deltas;
        displayDocumentHistory();
      })
      .catch((error) => {
        console.error("Error fetching document history:", error);
      });
  }

  // Display document history in the panel
  function displayDocumentHistory() {
    const historyContent = document.querySelector(".history-content");
    if (!historyContent || !documentHistory.length) return;

    // Clear previous content
    historyContent.innerHTML = "";

    // Sort history by timestamp (newest first)
    const sortedHistory = [...documentHistory].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    // Create a list of changes
    sortedHistory.forEach((change) => {
      const changeItem = document.createElement("div");
      changeItem.className = "history-item";

      // Format timestamp
      const date = new Date(change.timestamp);
      const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

      // Create change HTML
      changeItem.innerHTML = `
                <div class="history-item-header">
                    <span class="history-user">${change.userName}</span>
                    <span class="history-time">${formattedDate}</span>
                </div>
                <div class="history-delta-preview"></div>
            `;

      // Add preview of the delta
      const deltaPreview = changeItem.querySelector(".history-delta-preview");

      // Show a simplified version of what changed
      if (change.delta.ops) {
        const previewText = change.delta.ops
          .map((op) => {
            if (op.insert)
              return `Added: "${
                typeof op.insert === "string" ? op.insert : "[object]"
              }"`;
            if (op.delete) return `Deleted ${op.delete} characters`;
            if (op.retain)
              return `Kept ${op.retain} characters${
                op.attributes ? " with formatting" : ""
              }`;
            return "";
          })
          .join(", ");

        deltaPreview.textContent = previewText || "No changes";
      }

      // Add click event to restore this version
      changeItem.addEventListener("click", () => {
        // In a real app, you might implement version restoration here
        console.log("Would restore to version:", change);
      });

      historyContent.appendChild(changeItem);
    });
  }

  // Initialize the application
  initializeEditor();
});
