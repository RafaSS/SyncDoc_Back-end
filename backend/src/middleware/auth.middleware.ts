import { Request, Response, NextFunction } from "express";
import { supabase, TABLES } from "../config/supabase";

/**
 * Middleware to check if user is authenticated
 */
export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token;
  // console.log("Auth token from cookie:", req.cookies.auth_token);

  // First check for auth_token in cookies
  if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }

  // Then check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith("Bearer ")) {
    const parts = authHeader.split(" ");
    if (parts.length === 2) {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    // Verify the token with Supabase
    // console.log("Verifying token with Supabase");
    const { data, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error("Token verification error:", error);

      // Clear invalid cookie if present
      if (req.cookies && req.cookies.auth_token) {
        // console.log("Clearing invalid cookie", error);
        res.clearCookie("auth_token");
      }

      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (!data.user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Add user to request object
    (req as any).user = data.user;
    next();
  } catch (error: any) {
    console.error("Auth middleware error:", error);
    return res
      .status(500)
      .json({ error: "Server error during authentication" });
  }
};

/**
 * Middleware to check if user has permission for a document
 * @param permission The required permission level ('view', 'edit', 'own')
 */
export const hasDocumentPermission = (
  permission: "viewer" | "editor" | "owner"
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const documentId = req.params.id;

      if (!userId || !documentId) {
        return res
          .status(400)
          .json({ error: "Missing user ID or document ID" });
      }

      // Map permission to roles
      let allowedRoles: string[] = [];
      switch (permission) {
        case "viewer":
          allowedRoles = ["viewer", "editor", "owner"];
          break;
        case "editor":
          allowedRoles = ["editor", "owner"];
          break;
        case "owner":
          allowedRoles = ["owner"];
          break;
      }

      // Check user's role for this document
      const { data, error } = await supabase
        .from(TABLES.DOCUMENT_PERMISSIONS)
        .select("role")
        .eq("user_id", userId)
        .eq("document_id", documentId)
        .single();

      if (error || !data) {
        return res
          .status(403)
          .json({ error: "You do not have access to this document" });
      }

      if (!allowedRoles.includes(data.role)) {
        return res.status(403).json({
          error: `You need ${permission} permission for this operation`,
        });
      }

      next();
    } catch (error) {
      console.error("Document permission check error:", error);
      return res.status(500).json({ error: "Permission check error" });
    }
  };
};
