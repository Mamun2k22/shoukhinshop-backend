
import express from 'express';
import { addToCart, getCarts, removeFromCart, updateCartQuantity} from '../controller/cartController.js'; 
const router = express.Router();
router.post('/', addToCart); 
router.get('/', getCarts); 
router.delete('/:userId/:itemId', removeFromCart);
router.patch('/:userId/:itemId', updateCartQuantity);

export default router;
