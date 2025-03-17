-- SyncDoc Supabase Database Schema

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  is_online BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) DEFAULT 'Untitled Document',
  content JSONB DEFAULT '{"ops":[]}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document Changes Table (History)
CREATE TABLE IF NOT EXISTS document_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  delta JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User-Document Relationships Table
CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'viewer', -- viewer, editor, owner
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, document_id)
);

-- Create a system user for public documents
INSERT INTO users (id, name, email, is_online)
VALUES ('00000000-0000-0000-0000-000000000000', 'System', 'system@syncdoc.io', false)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_changes_document_id ON document_changes(document_id);
CREATE INDEX IF NOT EXISTS idx_document_changes_user_id ON document_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_document_id ON user_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);

-- Create Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users are viewable by everyone" 
ON users FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON users FOR UPDATE USING (auth.uid() = id);

-- Create policies for documents table
CREATE POLICY "Documents are viewable by users with access" 
ON documents FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_documents 
    WHERE document_id = documents.id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Documents can be inserted by authenticated users" 
ON documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Documents can be updated by users with editor or owner role" 
ON documents FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_documents 
    WHERE document_id = documents.id 
    AND user_id = auth.uid() 
    AND role IN ('editor', 'owner')
  )
);

CREATE POLICY "Documents can be deleted by owners" 
ON documents FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_documents 
    WHERE document_id = documents.id 
    AND user_id = auth.uid() 
    AND role = 'owner'
  )
);

-- Create policies for document_changes table
CREATE POLICY "Document changes are viewable by users with access to the document" 
ON document_changes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_documents 
    WHERE document_id = document_changes.document_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Document changes can be inserted by users with editor or owner role" 
ON document_changes FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_documents 
    WHERE document_id = document_changes.document_id 
    AND user_id = auth.uid() 
    AND role IN ('editor', 'owner')
  )
);

-- Create policies for user_documents table
CREATE POLICY "User document relationships are viewable by referenced users" 
ON user_documents FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM user_documents ud 
    WHERE ud.document_id = user_documents.document_id 
    AND ud.user_id = auth.uid()
  )
);

CREATE POLICY "User document relationships can be created by document owners" 
ON user_documents FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_documents 
    WHERE document_id = user_documents.document_id 
    AND user_id = auth.uid() 
    AND role = 'owner'
  )
);

CREATE POLICY "User document relationships can be updated by document owners" 
ON user_documents FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_documents 
    WHERE document_id = user_documents.document_id 
    AND user_id = auth.uid() 
    AND role = 'owner'
  )
);

CREATE POLICY "User document relationships can be deleted by document owners" 
ON user_documents FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_documents 
    WHERE document_id = user_documents.document_id 
    AND user_id = auth.uid() 
    AND role = 'owner'
  )
);
