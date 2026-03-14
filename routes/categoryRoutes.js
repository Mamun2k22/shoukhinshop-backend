import express from 'express';
// import { isAdmin } from '../middleware/isAdmin.js';
// import { protect } from '../middleware/protect.js';
import {
  addCategory,
  getAllCategories,
  getProductsByCategory,
  deleteCategory,
  updateCategory, 
} from '../controller/categoryController.js';

const router = express.Router();

// Admin route: Add a new category
router.post('/', addCategory); // Admin only

// User route: Get all categories
router.get('/', getAllCategories); // Public access
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory); 

// User route: Get products by category name
router.get('/:name', getProductsByCategory); // Public access


export default router;

