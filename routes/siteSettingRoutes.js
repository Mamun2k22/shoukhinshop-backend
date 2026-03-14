// routes/siteSettingRoutes.js
import { Router } from "express";
import upload from "../middleware/upload.js";
import {
  getPublicSetting,
  upsertLogo,
  deleteLogo,
  updateSetting,
} from "../controller/siteSettingController.js";

const router = Router();

router.get("/public", getPublicSetting);
router.put("/", updateSetting);

// Logo add/edit (same endpoint)
router.post("/logo", upload.single("logo"), upsertLogo);

// Logo delete
router.delete("/logo", deleteLogo);

export default router;
