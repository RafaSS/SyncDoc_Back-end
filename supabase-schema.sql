-- Create users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled Document',
  content JSONB NOT NULL DEFAULT '{"ops":[]}',
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create document permissions table
CREATE TABLE public.document_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission_level TEXT CHECK (permission_level IN ('read', 'write', 'admin')) NOT NULL DEFAULT 'read',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(document_id, user_id)
);

-- Create document history table
CREATE TABLE public.document_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  delta JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating updated_at
CREATE TRIGGER update_profiles_modtime
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_documents_modtime
BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_document_permissions_modtime
BEFORE UPDATE ON public.document_permissions
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Row Level Security policies

-- Profiles table policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Documents table policies
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents they have permission for"
ON public.documents FOR SELECT
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM public.document_permissions
    WHERE document_id = documents.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update documents they own or have write/admin permission for"
ON public.documents FOR UPDATE
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM public.document_permissions
    WHERE document_id = documents.id AND user_id = auth.uid() AND permission_level IN ('write', 'admin')
  )
);

CREATE POLICY "Users can insert documents"
ON public.documents FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete documents they own or have admin permission for"
ON public.documents FOR DELETE
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM public.document_permissions
    WHERE document_id = documents.id AND user_id = auth.uid() AND permission_level = 'admin'
  )
);

-- Document permissions table policies
ALTER TABLE public.document_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document permissions for documents they have access to"
ON public.document_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = document_permissions.document_id AND owner_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.document_permissions
    WHERE document_id = document_permissions.document_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Only document owners and admins can manage permissions"
ON public.document_permissions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = document_permissions.document_id AND owner_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.document_permissions
    WHERE document_id = document_permissions.document_id AND user_id = auth.uid() AND permission_level = 'admin'
  )
);

-- Document history table policies
ALTER TABLE public.document_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history for documents they have access to"
ON public.document_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = document_history.document_id AND owner_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.document_permissions
    WHERE document_id = document_history.document_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert history for documents they can edit"
ON public.document_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = document_history.document_id AND owner_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.document_permissions
    WHERE document_id = document_history.document_id AND user_id = auth.uid() AND permission_level IN ('write', 'admin')
  )
);