import mongoose from "mongoose";

// Define user schema
const productUserIdSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // reference to user collection
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Add productId to reference Product schema
  quantity: { type: Number, default: 1 },
  itemPrice: { type: Number, default: 1 },
  selectedSize: { type: String }, // Add size for the selected product
  selectedWeight: { type: String }, // Add weight for the selected product
  selectedColor: { type: String }, // Add color for the selected product
}, { collection: 'carts' }); 

// Export the user model
const AddToCart = mongoose.model("AddToCart", productUserIdSchema);
export default AddToCart;
