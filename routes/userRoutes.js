// routes/userRoutes.js
import express from "express";
import { getAllUsers, deleteUserById, getUserProfile, updateUserProfile, changePassword, updateUserRole } from "../controller/userController.js";
import { ensureAuth } from "../middleware/protect.js";

const router = express.Router();

router.get("/",ensureAuth, getAllUsers);
router.delete("/:id",ensureAuth, deleteUserById);

// ✅ এই দুইটা পাশাপাশি রাখো
router.get("/profile", ensureAuth, getUserProfile);     // <-- GET /api/users/profile
router.put("/profile", ensureAuth, updateUserProfile);  // <-- PUT /api/users/profile
router.put("/change-password",ensureAuth, changePassword);
router.patch("/:id/role", ensureAuth, updateUserRole);

export default router;

