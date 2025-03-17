import { Router } from "express";
import { isAuthenticated } from "../../middleware/auth.middleware";
import { createServices } from "../../config/service-factory";

const router = Router();
const { userService } = createServices();

/**
 * @route GET /api/users/profile
 * @description Get user profile data
 * @access Private
 */
router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const profileData = await userService.getUserById(userId);
    res.json(profileData);
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: error.message || "Failed to fetch profile" });
  }
});

/**
 * @route PUT /api/users/profile
 * @description Update user profile
 * @access Private
 */
router.put("/profile", isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const updateData = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const updatedProfile = await userService.updateUser(userId, updateData);
    res.json(updatedProfile);
  } catch (error: any) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: error.message || "Failed to update profile" });
  }
});

/**
 * @route DELETE /api/users/profile
 * @description Delete user account
 * @access Private
 */
router.delete("/profile", isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    await userService.deleteUser(userId);
    res.json({ message: "Account deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting account:", error);
    res.status(500).json({ error: error.message || "Failed to delete account" });
  }
});

export default router;
