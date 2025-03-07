# SyncDoc - Real-time Collaborative Document Editor

SyncDoc is a real-time collaborative document editing application that allows multiple users to edit the same document simultaneously.

## Deployment on Render

### Automatic Deployment with Blueprint (Recommended)

The easiest way to deploy SyncDoc is to use the Blueprint configuration:

1. Fork or clone this repository to your GitHub account
2. Sign up for a [Render account](https://render.com)
3. Create a new Blueprint on Render
4. Connect your GitHub repository
5. Render will automatically deploy both the backend and frontend services as defined in `render.yaml`

### Manual Deployment

#### Backend Service

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use the following settings:
   - **Name**: syncdoc-backend
   - **Environment**: Node
   - **Region**: Your preferred region
   - **Branch**: main (or your preferred branch)
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free (or your preferred plan)
   - **Environment Variables**:
     - `NODE_ENV`: production
     - `PORT`: 10000
     - `ALLOWED_ORIGINS`: https://syncdoc-frontend.onrender.com,http://localhost:3000
     - `COOKIE_SECRET`: (generate a secure random string)
     - `COOKIE_MAX_AGE`: 2592000000

#### Frontend Service

1. Create a new Static Site on Render
2. Connect your GitHub repository
3. Use the following settings:
   - **Name**: syncdoc-frontend
   - **Branch**: main (or your preferred branch)
   - **Build Command**: `cd frontend && npm install`
   - **Publish Directory**: ./frontend
   - **Environment Variables**:
     - `NODE_ENV`: production
     - `API_BASE_URL`: https://syncdoc-backend.onrender.com/api
     - `SOCKET_URL`: https://syncdoc-backend.onrender.com

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   cd backend && npm install
   cd frontend && npm install
   ```
3. Start the backend:
   ```
   cd backend && npm run dev
   ```
4. Start the frontend in a separate terminal:
   ```
   cd frontend && npm run dev
   ```
5. Access the application at http://localhost:3000

## Features

- Real-time collaborative editing
- Document version history
- User presence indicators
- Document sharing
- Rich text formatting

## Tech Stack

- Backend: Node.js, Express, Socket.IO
- Frontend: HTML, CSS, JavaScript, Socket.IO client, Quill editor
