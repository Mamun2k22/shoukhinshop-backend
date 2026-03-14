// routes/sellerVerificationRoutes.js
import express from "express";
import { ensureAuth, ensureAdmin } from "../middleware/protect.js";
import { upload } from "../middleware/uploadVerification.js"; // ⬅️ named import
import * as ctrl from "../controller/sellerVerification.controller.js";

const r = express.Router();

// Seller
r.post("/seller/verification", ensureAuth, upload.array("files", 6), ctrl.submitVerification);
r.get("/seller/verification/me", ensureAuth, ctrl.getMyVerification);

// Admin
r.get("/seller/verification/pending", ensureAuth, ensureAdmin, ctrl.listPending);
r.get("/seller/verification/approved", ensureAuth, ensureAdmin, ctrl.listApproved); // 👈 NEW

r.patch("/seller/verification/:id/approve", ensureAuth, ensureAdmin, ctrl.approve);
r.patch("/seller/verification/:id/reject", ensureAuth, ensureAdmin, ctrl.reject);

export default r;
