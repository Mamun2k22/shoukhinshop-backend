// controller/sellerVerification.controller.js
import path from "path";
import SellerVerification from "../model/sellerVerification.model.js";
import User from "../model/user.model.js";

// ✅ local file → public URL under /uploads
const toUrl = (file) => {
  // multer diskStorage দিলে file.filename থাকে, নইলে path থেকে basename নিন
  const fname = file?.filename || path.basename(file?.path || "");
  return `/uploads/verification/${fname}`;
};

// Seller submits or resubmits (upsert)
export const submitVerification = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ normalized in protect
    const { businessName, contactEmail, contactPhone, docsMeta } = req.body;

    if (!businessName) {
      return res.status(400).json({ message: "Business name is required" });
    }
    if (!req.files?.length) {
      return res.status(400).json({ message: "At least one document is required" });
    }

    // docsMeta = JSON.stringify([{ kind: "nid_front", note: "" }, ...])
    let meta = [];
    try {
      meta = JSON.parse(docsMeta || "[]");
      if (!Array.isArray(meta)) meta = [];
    } catch {
      meta = [];
    }

    const documents = req.files.map((f, i) => ({
      kind: meta[i]?.kind || "other",
      note: meta[i]?.note || "",
      url: toUrl(f),
    }));

    const doc = await SellerVerification.findOneAndUpdate(
      { userId },
      {
        userId,
        businessName,
        contactEmail,
        contactPhone,
        documents,
        status: "pending",
        adminNote: "",
        decidedBy: undefined,
        decidedAt: undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res
      .status(201)
      .json({ message: "Submitted for review", verification: doc });
  } catch (err) {
    console.error("submitVerification error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Seller sees his own verification (or "none")
export const getMyVerification = async (req, res) => {
  try {
    const v = await SellerVerification.findOne({ userId: req.user.id }).lean();
    return res.json(v || { status: "none" });
  } catch (err) {
    console.error("getMyVerification error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin — list pending
export const listPending = async (_req, res) => {
  try {
    const items = await SellerVerification.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();
    return res.json(items);
  } catch (err) {
    console.error("listPending error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin — approve
export const approve = async (req, res) => {
  try {
    const v = await SellerVerification.findByIdAndUpdate(
      req.params.id,
      { status: "approved", decidedBy: req.user.id, decidedAt: new Date(), adminNote: "" },
      { new: true }
    );
    if (!v) return res.status(404).json({ message: "Not found" });

    // ✅ mark user wholesale
    await User.findByIdAndUpdate(v.userId, { $set: { wholesaleApproved: true } });

    return res.json({ message: "Approved", verification: v });
  } catch (err) {
    console.error("approve error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin — reject
export const reject = async (req, res) => {
  try {
    const { reason = "" } = req.body;
    const v = await SellerVerification.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", adminNote: reason, decidedBy: req.user.id, decidedAt: new Date() },
      { new: true }
    );
    if (!v) return res.status(404).json({ message: "Not found" });

    // ❌ unset wholesale
    await User.findByIdAndUpdate(v.userId, { $set: { wholesaleApproved: false } });

    return res.json({ message: "Rejected", verification: v });
  } catch (err) {
    console.error("reject error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// controller/sellerVerification.controller.js

export const listApproved = async (_req, res) => {
  try {
    const items = await SellerVerification
      .find({ status: "approved" })
      .sort({ decidedAt: -1 })
      .select("-__v")
      .lean();
    return res.json(items);
  } catch (err) {
    console.error("listApproved error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
