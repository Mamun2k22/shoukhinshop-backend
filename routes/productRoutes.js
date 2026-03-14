// productRoutes.js

import express from "express";
import {
  addProduct,
  getAllProducts,
  singleProducts,
  deleteProductById,
  searchQuery,
   typeaheadSuggestions, 
  getRelatedProducts,
  updateProductById,
  getPublicProducts,
  listStockTable,
   getPublicProductsByHomeCategory, 
} from "../controller/productController.js";

const router = express.Router();
router.get("/admin/stock-table", listStockTable);
router.get("/public/home/:slug", getPublicProductsByHomeCategory);
// Public/User-accessible routes
router.get("/public", getPublicProducts);
router.get("/search", searchQuery);
router.get("/related/:category", getRelatedProducts); // <-- এটা উপরে
router.get("/:id", singleProducts);                    // <-- এটা নিচে
router.get("/", getAllProducts);
router.get("/search", searchQuery);              // ?q=apple
router.get("/suggest", typeaheadSuggestions); 
router.post("/", addProduct);
router.delete("/:id", deleteProductById);
router.put("/:id", updateProductById);


export default router;
