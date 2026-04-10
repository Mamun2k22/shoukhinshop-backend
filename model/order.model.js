import mongoose from "mongoose";
const { Schema } = mongoose;

const OrderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    guestId: {
      type: String,
      required: false,
      index: true,
    },

    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },

        selectedSize: { type: String },
        selectedWeight: { type: String },
        selectedColor: { type: String },
        selectedChest: { type: String },
        selectedWaist: { type: String },
      },
    ],

    totalPrice: { type: Number, required: true },
    address: { type: String, required: true },

    customer: {
      name: { type: String },
      email: { type: String },
      mobile: { type: String, required: true },
    },

    shippingCost: { type: Number, required: true },

    shippingOption: {
      type: String,
      enum: ["inside", "outside"],
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["Bkash", "Cash", "Cash on Delivery"],
      required: true,
    },

    orderStatus: {
      type: String,
      enum: ["pending", "processing", "delivered", "cancelled"],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "partial", "refunded"],
      default: "unpaid",
    },

    paidAt: { type: Date },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    createdAt: { type: Date, default: Date.now },

    transferStatus: {
      type: String,
      enum: ["not_required", "pending", "transferred", "failed"],
      default: "not_required",
    },

    banggoResponse: { type: Object },
    banggoInvoice: { type: String },

    pricing: {
      subtotal: { type: Number, default: 0 },
      couponTotal: { type: Number, default: 0 },
      productTotalAfterDiscount: { type: Number, default: 0 },
      shippingBase: { type: Number, default: 0 },
      freeThresholdUsed: { type: Number, default: 0 },
      inCampaign: { type: Boolean, default: false },
    },
  },
  {
    collection: "order",
  }
);

const Order = mongoose.model("Order", OrderSchema);
export default Order;