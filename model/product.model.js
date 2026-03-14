// product.model.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true },
    productName: { type: String, required: true, trim: true },

    // 🔥 NEW: multiple category id
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
      },
    ],

    // (optional: keep for backward support)
    categoryName: { type: String, trim: true },

    // ✅ 3 prices
    // Buy/Purchase/Buying price
    buyPrice: { type: Number, default: 0, min: 0 },

    // Regular price
    regularPrice: { type: Number, required: true, min: 0 },

    // Sell price (your existing field name stays price)
    price: { type: Number, required: true, min: 0 },

    // ❌ discount removed
    // discount: { type: Number, default: 0, min: 0 },

    // ✅ Delivery system
    delivery: {
      type: {
        type: String,
        enum: ["cash_on_delivery", "free_delivery"],
        default: "cash_on_delivery",
      },
      area: {
        type: String,
        enum: ["inside_dhaka", "outside_dhaka", "all_bangladesh", null],
        default: null,
      },
    },
    banggoProductId: { type: Number }, // Banggomart product id
    supplier: {
      type: String,
      enum: ["local", "banggomart"],
      default: "local",
    },

    brand: { type: String, trim: true },

    sizeWeight: [
      {
        size: { type: String, trim: true },
      },
    ],
        // ✅ NEW optional measurement fields
    chest: [
      {
        size: { type: String, trim: true },
      },
    ],

    waist: [
      {
        size: { type: String, trim: true },
      },
    ],

    color: [String],
    details: { type: String, required: true, trim: true },
    longDetails: { type: String, required: true, trim: true },
    status: { type: String, default: "available" },
    stock: { type: Number, default: 0, min: 0 },
    ratings: { type: Number, default: 0, min: 0, max: 5 },
    productImage: { type: [String], required: true },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },

  { timestamps: true },
);

productSchema.index({
  productName: "text",
  sku: "text",
  brand: "text",
  categoryName: "text",
});
productSchema.index({ createdAt: -1 });

const Product = mongoose.model("Product", productSchema);
export default Product;
