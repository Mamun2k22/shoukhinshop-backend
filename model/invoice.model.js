// ✅ invoice.model.js
import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
    items:   [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        qty: Number,
        price: Number,
        subtotal: Number
      }
    ],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    issuedAt: { type: Date, default: Date.now },
    paidAt:   { type: Date },
    notes:    { type: String }
  },
  { timestamps: true }
);

// 🛡 Hot-reload safe — আগে থেকে থাকলে সেটাই ব্যবহার করো
const Invoice = mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);
export default Invoice;
