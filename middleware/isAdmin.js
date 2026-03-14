// middlewares/isAdmin.js
// export const isAdmin = (req, res, next) => {
//     if (req.user && req.user.role === "admin") { // Changed "isAdmin" to "admin"
//         return next();
//     } else {
//         return res.status(403).json({ message: "Access denied. Admins only." });
//     }

import User from "../model/user.model.js";

// };
export const isAdmin = async (req, res, next) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Not authenticated" });

    const user = await User.findById(req.user.id).select("role");
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};