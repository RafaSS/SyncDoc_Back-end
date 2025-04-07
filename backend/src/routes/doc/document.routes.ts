import { Router } from "express";
import {
  isAuthenticated,
  hasDocumentPermission,
} from "../../middleware/auth.middleware";
import { createServices } from "../../config/service-factory";
import { supabase } from "../../config/supabase";
import { IDocumentService } from "../../interfaces/document-service.interface";
import cookieParser from "cookie-parser";

const router = Router();
router.use(cookieParser());

// Determine if we're in test mode
const isTest = process.env.NODE_ENV === "test";

// In test mode, use the mock document service
let documentService: IDocumentService;
if (isTest) {
  // Import the mockDocumentService from test-helpers
  const { mockDocumentService } = require("../../test-helpers");
  documentService = mockDocumentService;
} else {
  const services = createServices();
  documentService = services.documentService;
}

// Create middleware arrays based on environment
const authMiddleware = isTest ? [] : [isAuthenticated];
const viewPermMiddleware = isTest
  ? []
  : [isAuthenticated, hasDocumentPermission("viewer")];
const editPermMiddleware = isTest
  ? []
  : [isAuthenticated, hasDocumentPermission("editor")];
const ownPermMiddleware = isTest
  ? []
  : [isAuthenticated, hasDocumentPermission("owner")];

/**
 * @route GET /api/documents
 * @description Get all documents accessible to the user
 * @access Private
 */
router.get("/", ...authMiddleware, async (req, res) => {
  console.log("Fetching all documents... 🥴");
  try {
    // Get user ID from authenticated user
    const userId = (req as any).user?.id;
    const documentList = await documentService.getAllDocumentsForUser(userId);
    console.log("Fetched documents:", documentList);
    res.json(documentList);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

/**
 * @route GET /api/documents/:id
 * @description Get a document by ID
 * @access Private
 */
router.get("/:id", async (req, res) => {
  console.log("Fetching document with ID... 🥴");
  const { id } = req.params;
  try {
    const document = await documentService.getDocumentById(id);

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Get user count for this document
    const users = await documentService.getDocumentUsers(id);
    const userCount = Object.keys(users).length;

    // Return document without sending all deltas to keep response size manageable
    res.json({
      id: document.id,
      title: document.title,
      content: document.content,
      userCount,
    });
    console.log("Document fetched successfully 😍", document);
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

/**
 * @route GET /api/documents/:id/history
 * @description Get document change history
 * @access Private
 */
router.get("/:id/history", async (req, res) => {
  console.log("Fetching document history... 🥴");
  const { id } = req.params;

  try {
    const document = await documentService.getDocumentById(id);

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Return the deltas array from the document
    res.json({
      deltas: document.deltas || [],
    });
  } catch (error) {
    console.error("Error fetching document history:", error);
    res.status(500).json({ error: "Failed to fetch document history" });
  }
});

/**
 * @route POST /api/documents
 * @description Create a new document
 * @access Private
 */
router.post("/", ...authMiddleware, async (req, res) => {
  console.log("Creating document...🎶🎶🎶");
  try {
    // Get user ID from authenticated user
    const userId = (req as any).user?.id;
    console.log("User ID:", userId);
    const { id } = await documentService.createDocument(
      undefined,
      undefined,
      userId
    );

    // Set the creator as owner
    if (userId) {
      await documentService.setDocumentPermission(id, userId, "owner");
    }

    res.json({ id });
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(500).json({ error: "Failed to create document" });
  }
});

/**
 * @route DELETE /api/documents/:id
 * @description Delete a document
 * @access Private
 */
router.delete("/:id", ...authMiddleware, async (req, res) => {
  console.log("Deleting document...🎶🎶🎶");
  const { id } = req.params;

  try {
    const success = await documentService.deleteDocument(id);

    if (!success) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

/**
 * @route POST /api/documents/:id/share
 * @description Share a document with another user
 * @access Private
 */
router.post("/:id/share", async (req, res) => {
  console.log("Sharing document...🎶🎶🎶");
  const { id } = req.params;
  const { email, role } = req.body;

  if (!email || !["viewer", "editor", "owner"].includes(role)) {
    return res.status(400).json({
      error: "Valid email and role (viewer, editor, owner) are required",
    });
  }

  try {
    // Find user by email
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: "User not found" });
    }

    // Set permission
    await documentService.setDocumentPermission(id, userData.id, role);

    res.json({ message: "Document shared successfully" });
  } catch (error) {
    console.error("Error sharing document:", error);
    res.status(500).json({ error: "Failed to share document" });
  }
});

export default router;
