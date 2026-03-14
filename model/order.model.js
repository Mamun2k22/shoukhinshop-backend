import mongoose from 'mongoose';
const { Schema } = mongoose;

const OrderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },

        // user-selected options (optional)
        selectedSize: { type: String },
        selectedWeight: { type: String },
        selectedColor: { type: String },
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
      enum: ['inside', 'outside'],
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ['Bkash', 'Cash', 'Cash on Delivery'],
      required: true,
    },

    // order lifecycle
    orderStatus: {
      type: String,
      enum: ["pending", "processing", "delivered", "cancelled"],
      default: 'pending',
    },

    // payment lifecycle (fixed)
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'partial', 'refunded'],
      default: 'unpaid',
    },
    paidAt: { type: Date }, // set when paid

    // link to generated invoice (optional but useful)
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },

    createdAt: { type: Date, default: Date.now },


    // Dropship transfer tracking
transferStatus: {
  type: String,
  enum: ["not_required", "pending", "transferred", "failed"],
  default: "not_required",
},

banggoResponse: { type: Object },
banggoInvoice: { type: String },

  },
  {
    collection: 'order',
  }
);

const Order = mongoose.model('Order', OrderSchema);
export default Order;
