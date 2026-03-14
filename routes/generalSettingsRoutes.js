import express from "express";
import { protect } from "../middleware/protect.js";
import { isAdmin } from "../middleware/isAdmin.js";
import {
  getGeneralSettings,
  updateGeneralSettings,
} from "../controller/generalSettingsController.js";

const router = express.Router();

// public (frontend can show footer/header contact info)
router.get("/settings/general", getGeneralSettings);

// admin only
router.put("/admin/settings/general", protect, isAdmin, updateGeneralSettings);

export default router;
