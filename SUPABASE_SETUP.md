# SyncDoc Supabase Setup Guide

This guide explains how to set up Supabase for the SyncDoc application.

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up for an account
2. Create a new project and note down your project URL and anon key

## 2. Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

## 3. Set Up Database Schema

1. In your Supabase dashboard, navigate to the SQL Editor
2. Create a new query and paste the contents of `supabase-schema.sql`
3. Run the query to create all the necessary tables, indexes, and security policies

## 4. Install Dependencies

Make sure you have all dependencies installed:

```bash
npm install @supabase/supabase-js dotenv
```

## 5. Database Structure

The Supabase database consists of the following tables:

1. **users** - Stores user information
   - `id`: UUID (primary key)
   - `name`: User's display name
   - `email`: User's email address
   - `is_online`: Online status flag
   - `last_active`: Timestamp of last activity
   - `created_at`: Creation timestamp
   - `updated_at`: Update timestamp

2. **documents** - Stores document information
   - `id`: UUID (primary key)
   - `title`: Document title
   - `content`: Document content in JSON format (Quill Delta)
   - `created_by`: Reference to creator user
   - `created_at`: Creation timestamp
   - `updated_at`: Update timestamp

3. **document_changes** - Stores document change history
   - `id`: UUID (primary key)
   - `document_id`: Reference to document
   - `user_id`: Reference to user who made the change
   - `delta`: The change delta in JSON format
   - `created_at`: Timestamp when the change was made

4. **user_documents** - Stores user-document relationships
   - `id`: UUID (primary key)
   - `user_id`: Reference to user
   - `document_id`: Reference to document
   - `role`: User's role for this document (viewer, editor, owner)
   - `created_at`: Creation timestamp

## 6. Row Level Security (RLS)

The schema includes Row Level Security policies to ensure users can only access documents they have permission to view or edit. These policies are automatically set up when you run the SQL script.

## 7. Testing

The application is configured to work with the E2E testing infrastructure. It uses separate ports for testing:

- Express API server: Port 3003 (TEST_PORT)
- Socket.IO server: Port 3002 (TEST_SOCKET_PORT)

For production, it uses:

- Express API server: Port 3000 (PORT)
- Socket.IO server: Port 3001 (SOCKET_PORT)

## 8. Troubleshooting

If you encounter any issues with the Supabase integration:

1. Check that your Supabase URL and anon key are correct in the `.env` file
2. Ensure the database schema was correctly applied
3. Check the console for any error messages
4. Verify that the RLS policies are correctly applied for your user
