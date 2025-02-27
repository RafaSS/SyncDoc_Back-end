# SyncDoc

A real-time collaborative document editing application built with Bun, Express, Socket.IO, and Quill editor.

## Prerequisites

- [Bun](https://bun.sh/) installed on your system
- Modern web browser (Chrome, Firefox, Edge, Safari)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/SyncDoc_Back-end.git
cd SyncDoc_Back-end
```

2. Install dependencies:
```bash
bun install
```

3. Copy `.env.example` to `.env` and configure as needed:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
bun run dev
```

5. Or build and start the production server:
```bash
bun run build
bun run start
```

6. Open your browser and navigate to `http://localhost:3000`

## Features

Current features:
- Real-time collaborative document editing
- Rich text editor with basic formatting options
- User presence indicators
- Document sharing via URL
- Multiple users can edit the same document simultaneously
- Cursor tracking to see where others are editing
- User join/leave notifications
- Document creation

Future features (roadmap):
- User authentication and authorization
- More text formatting options
- Comments and suggestions
- Version history
- Export to different formats
- Image and media support
- Tables and advanced formatting
- Spell checking and grammar checking

## Development

- Run tests:
```bash
bun test
```

- Lint your code:
```bash
bun run lint
```

## How it works

The application uses:
- Bun as the JavaScript runtime
- Express for serving static files and handling HTTP requests
- Socket.IO for real-time bidirectional communication
- Quill as the rich text editor
- UUID for generating unique user and document IDs
- Operational Transformation for handling concurrent edits

When a user makes changes to a document, those changes are broadcast to all other users viewing the same document in real-time. The server acts as a central hub, maintaining the document state and synchronizing changes between clients.

## Technologies Used

- Bun
- Express.js
- Socket.IO
- TypeScript
- Quill Editor
- ESLint for code quality
- Jest for testing
- HTML5/CSS3
- UUID

## Project Structure

```
/
├── public/               # Static files served to the client
│   ├── index.html        # Main HTML page
│   ├── styles.css        # CSS styles
│   └── script.js         # Client-side JavaScript
│
├── src/                  # Server-side TypeScript code
│   ├── app.ts            # Main application file
│   └── app.test.ts       # Server-side tests
│
├── e2e/                  # End-to-end tests
│   └── editor.test.ts    # E2E tests for the editor
│
├── .env.example          # Example environment variables
├── .gitignore            # Git ignore file
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # Project documentation
```

## Learning Guide

This project is designed as a learning experience. Follow these steps to enhance the application:

1. **Understand the Basics**: Start by exploring the existing code to understand how the real-time collaboration works using Socket.IO.

2. **Implement User Authentication**: Add user registration and login functionality.

3. **Enhance Text Formatting**: Extend the editor's capabilities with more formatting options.

4. **Add Document Management**: Implement features for better document organization and management.

5. **Implement Version History**: Add the ability to track and restore previous versions of documents.

6. **Add Comments and Suggestions**: Implement a system for adding comments and suggesting changes.

7. **Optimize for Performance**: As the application grows, focus on performance optimizations.

8. **Add Tests**: Uncomment and expand the test files to ensure quality and stability.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
