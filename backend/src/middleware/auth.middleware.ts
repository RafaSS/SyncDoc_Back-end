import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

/**
 * Middleware to check if user is authenticated
 */
export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  // Get the authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header provided' });
  }
  
  // Check if it's a Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }
  
  const token = parts[1];
  
  try {
    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Add user data to request for use in route handlers
    (req as any).user = data.user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Middleware to check if user has permission for a document
 * @param permission The required permission level ('view', 'edit', 'own')
 */
export const hasDocumentPermission = (permission: 'view' | 'edit' | 'own') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const documentId = req.params.id;
      
      if (!userId || !documentId) {
        return res.status(400).json({ error: 'Missing user ID or document ID' });
      }
      
      // Map permission to roles
      let allowedRoles: string[] = [];
      switch (permission) {
        case 'view':
          allowedRoles = ['viewer', 'editor', 'owner'];
          break;
        case 'edit':
          allowedRoles = ['editor', 'owner'];
          break;
        case 'own':
          allowedRoles = ['owner'];
          break;
      }
      
      // Check user's role for this document
      const { data, error } = await supabase
        .from('user_documents')
        .select('role')
        .eq('user_id', userId)
        .eq('document_id', documentId)
        .single();
      
      if (error || !data) {
        return res.status(403).json({ error: 'You do not have access to this document' });
      }
      
      if (!allowedRoles.includes(data.role)) {
        return res.status(403).json({ 
          error: `You need ${permission} permission for this operation` 
        });
      }
      
      next();
    } catch (error) {
      console.error('Document permission check error:', error);
      return res.status(500).json({ error: 'Permission check error' });
    }
  };
};
