import express from "express";
import { protect } from '../middleware/protect.js';
import { isAdmin } from '../middleware/isAdmin.js';
import {
  placeOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getAllOrders,
  getPendingOrders,
  getConfirmedOrders,
  getCancelledOrders,
  getDeliveredOrders,
  getSalesReport,
  getDashboardSummary,
  getDashboardStats
} from "../controller/orderController.js";

const router = express.Router();
router.post("/order", placeOrder);
router.get("/orders/:userId", getUserOrders);
router.get("/order/:orderId", getOrderById);
// Admin-only routes
router.get("/orders", protect, isAdmin, getAllOrders);
router.get("/orders/pending", protect, isAdmin, getPendingOrders);
router.get("/orders/confirmed", protect, isAdmin, getConfirmedOrders);
router.get("/orders/cancelled", protect, isAdmin, getCancelledOrders);
router.get("/orders/delivered", protect, isAdmin, getDeliveredOrders);
router.get("/admin/dashboard/summary",  getDashboardSummary);

router.put("/order/:orderId", protect, isAdmin, updateOrderStatus);
router.delete("/order/:orderId", protect, isAdmin, cancelOrder);
router.get("/reports/sales", protect, isAdmin, getSalesReport);
router.get("/admin/dashboard/stats", getDashboardStats);



export default router;
