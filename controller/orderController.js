import { User, Order, Product } from "../model/index.model.js";
import Invoice from "../model/invoice.model.js";
import ShippingSettings from "../model/shippingSettings.model.js";
import { buildProductsMap, priceCart, computeShipping } from "../utils/pricing.js"; // <- add computeShipping
import banggoClient from "../services/banggoClient.js";

export const placeOrder = async (req, res) => {
  try {
    const {
      cartItems,
      shippingOption,
      paymentMethod,
      customer,
      userId,
      guestId,
      address,
      district,
    } = req.body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    if (!userId && !guestId) {
      return res.status(400).json({ message: "UserId or GuestId required" });
    }

    if (!address) {
      return res.status(400).json({ message: "Address required" });
    }

    if (!shippingOption) {
      return res.status(400).json({ message: "Shipping option required" });
    }

    if (!paymentMethod) {
      return res.status(400).json({ message: "Payment method required" });
    }

    if (!customer?.mobile) {
      return res.status(400).json({ message: "Customer mobile required" });
    }

    let user = null;

    if (userId) {
      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
    }

    const ids = cartItems.map((x) => x.productId);
    const products = await Product.find({ _id: { $in: ids } }).lean();

    if (!products.length) {
      return res.status(404).json({ message: "Products not found" });
    }

    const map = buildProductsMap(products);

    const priced = priceCart({
      items: cartItems.map((x) => ({
        productId: x.productId,
        quantity: x.quantity,
      })),
      productsById: map,
    });

    const settings = (await ShippingSettings.findOne().lean()) || {};
    const ship = computeShipping({
      subtotal: priced.total,
      selectedOption: shippingOption,
      district: district || "",
      settings,
    });

    const shippingCost = ship.shippingFinal;
    const totalCost = priced.total + shippingCost;

    const productsPayload = cartItems.map((item) => {
      const p = products.find(
        (pp) => String(pp._id) === String(item.productId)
      );

      if (!p) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const line = priced.lines.find(
        (l) => String(l.productId) === String(item.productId)
      );

      const unit = line ? Math.round(line.unit) : Number(p.price || 0);

      return {
        product: p._id,
        quantity: Number(item.quantity) || 1,
        price: unit,
        selectedSize: item.selectedSize || null,
        selectedWeight: item.selectedWeight || null,
        selectedColor: item.selectedColor || null,
        selectedChest: item.selectedChest || null,
        selectedWaist: item.selectedWaist || null,
      };
    });

    const newOrder = new Order({
      user: userId || null,
      guestId: userId ? null : guestId,
      products: productsPayload,
      totalPrice: totalCost,
      shippingCost,
      shippingOption,
      paymentMethod,
      customer: {
        name: customer?.name || user?.name || "Guest Customer",
        email: customer?.email || user?.email || "",
        mobile: customer?.mobile || user?.mobile || "",
      },
      address,
      transferStatus: "not_required",
      pricing: {
        subtotal: priced.subtotal,
        couponTotal: priced.couponTotal,
        productTotalAfterDiscount: priced.total,
        shippingBase: ship.shippingBase,
        freeThresholdUsed: ship.thresholdUsed || 0,
        inCampaign: ship.inCampaign || false,
      },
    });

    await newOrder.save();

    (async () => {
      try {
        const exists = await Invoice.findOne({ orderId: newOrder._id }).lean();
        if (exists) return;

        const items = (newOrder.products || []).map((it) => {
          const qty = it?.quantity ?? 1;
          const price = it?.price ?? 0;

          return {
            productId: it?.product,
            name: "",
            qty,
            price,
            subtotal: qty * price,
          };
        });

        const itemsTotal = items.reduce((s, x) => s + (x.subtotal || 0), 0);
        const totalAmount = itemsTotal + (newOrder.shippingCost || 0);

        await Invoice.create({
          orderId: newOrder._id,
          userId: newOrder.user || null,
          items,
          totalAmount,
          status: "unpaid",
          issuedAt: new Date(),
        });
      } catch (e) {
        console.error("auto-invoice failed:", e?.message);
      }
    })();

    try {
      const populated = await newOrder.populate("products.product");

      const dropshipItems = (populated.products || []).filter(
        (p) =>
          p?.product?.supplier === "banggomart" &&
          p?.product?.banggoProductId
      );

      if (dropshipItems.length > 0) {
        newOrder.transferStatus = "pending";
        await newOrder.save();

        const banggoTotal = dropshipItems.reduce(
          (sum, item) =>
            sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
          0
        );

        const invoiceNumber = `BM-${newOrder._id}`;

        const payload = {
          invoice_number: invoiceNumber,
          customer_name: newOrder.customer?.name || "",
          customer_phone: newOrder.customer?.mobile || "",
          delivery_area:
            newOrder.shippingOption === "inside"
              ? "Inside-Dhaka"
              : "Outside-Dhaka",
          customer_address: newOrder.address || "",
          price: banggoTotal,
          discount: 0,
          advance: 0,
          product_quantity: dropshipItems.reduce(
            (sum, item) => sum + (Number(item.quantity) || 1),
            0
          ),
          payment_type: "cod",
          order_type: "dropshipping",
          special_notes: "",
          payment_gateway: "bkash",
          transaction_id: "AUTO123",
          products: dropshipItems.map((item) => ({
            id: Number(item.product.banggoProductId),
            price: Number(item.price) || 0,
            color: item.selectedColor || "",
            size: item.selectedSize || "",
            qty: Number(item.quantity) || 1,
          })),
        };

        const response = await banggoClient.post("/create-order", payload);

        newOrder.transferStatus = "transferred";
        newOrder.banggoInvoice = invoiceNumber;
        newOrder.banggoResponse = response?.data || {};
        await newOrder.save();
      }
    } catch (err) {
      console.error("Banggomart transfer failed:", err?.message);
      newOrder.transferStatus = "failed";
      newOrder.banggoResponse = { message: err?.message };
      await newOrder.save();
    }

    return res.status(201).json({
      message: "Order placed successfully",
      order: newOrder,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error placing order",
      error: error.message,
    });
  }
};


// Get all orders for a user
export const getOrdersByCustomer = async (req, res) => {
  try {
    const { userId, guestId } = req.query;

    if (!userId && !guestId) {
      return res.status(400).json({ message: "UserId or GuestId required" });
    }

    const query = userId ? { user: userId } : { guestId };

    const orders = await Order.find(query)
      .populate({
        path: "products.product",
        select: "productName productImage",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json(orders || []);
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching orders",
      error: error.message,
    });
  }
};

// Get a specific order by ID
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate("products.product");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching order", error: error.message });
  }
};

// Get all orders (admin or for dashboard)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: "products.product",
        select: "productName productImage",
      })
      .populate({
        path: "user",
        select: "name email mobile",
      });

    res.status(200).json(orders);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching all orders", error: error.message });
  }
};

// Update an order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (orderStatus) {
      order.orderStatus = orderStatus;
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    await order.save();
    res.status(200).json({ message: "Order updated successfully", order });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating order", error: error.message });
  }
};

export const getPendingOrders = async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: "pending" })
      .populate({ path: "products.product", select: "productName productImage sku" })
      .populate({ path: "user", select: "name email mobile" })
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching pending orders", error: error.message });
  }
};

export const getConfirmedOrders = async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: "processing" })
      .populate({ path: "products.product", select: "productName productImage sku" })
      .populate({ path: "user", select: "name email mobile" })
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching confirmed orders", error: error.message });
  }
};

export const getCancelledOrders = async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: "cancelled" })
      .populate({ path: "products.product", select: "productName productImage sku" })
      .populate({ path: "user", select: "name email mobile" })
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cancelled orders", error: error.message });
  }
};
export const getDeliveredOrders = async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: "delivered" })
      .populate({ path: "products.product", select: "productName productImage sku" })
      .populate({ path: "user", select: "name email mobile" })
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching delivered orders", error: error.message });
  }
};

// Cancel or delete an order
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.orderStatus = "cancelled";
    await order.save();

    res.status(200).json({ message: "Order cancelled successfully", order });
  } catch (error) {
    res.status(500).json({ message: "Error cancelling order", error: error.message });
  }
};

export const getSalesReport = async (req, res) => {
  try {
    const {
      from,          // YYYY-MM-DD
      to,            // YYYY-MM-DD
      status,        // delivered | processing | pending | cancelled | all
      paymentStatus, // paid | unpaid | partial | refunded | all
      groupBy = "day" // day | month
    } = req.query;

    const match = {};

    // date range (createdAt)
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) match.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
    }

    if (status && status !== "all") match.orderStatus = status;
    if (paymentStatus && paymentStatus !== "all") match.paymentStatus = paymentStatus;

    const fmt = groupBy === "month" ? "%Y-%m" : "%Y-%m-%d";

    const rows = await Order.aggregate([
      { $match: match },
      {
        $addFields: {
          itemsCount: {
            $sum: {
              $map: {
                input: "$products",
                as: "p",
                in: { $ifNull: ["$$p.quantity", 0] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: fmt, date: "$createdAt" } },
          orders: { $sum: 1 },
          grossSales: { $sum: { $ifNull: ["$totalPrice", 0] } },      // includes shipping (your system)
          shipping: { $sum: { $ifNull: ["$shippingCost", 0] } },
          itemsSold: { $sum: { $ifNull: ["$itemsCount", 0] } },
          uniqueCustomers: { $addToSet: "$customer.mobile" },
        }
      },
      {
        $project: {
          _id: 0,
          period: "$_id",
          orders: 1,
          grossSales: 1,
          shipping: 1,
          itemsSold: 1,
          uniqueCustomers: { $size: { $setDifference: ["$uniqueCustomers", [null, ""]] } },
        }
      },
      { $sort: { period: 1 } }
    ]);

    // overall summary
    const summaryAgg = await Order.aggregate([
      { $match: match },
      {
        $addFields: {
          itemsCount: {
            $sum: {
              $map: { input: "$products", as: "p", in: { $ifNull: ["$$p.quantity", 0] } }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          grossSales: { $sum: { $ifNull: ["$totalPrice", 0] } },
          shipping: { $sum: { $ifNull: ["$shippingCost", 0] } },
          itemsSold: { $sum: { $ifNull: ["$itemsCount", 0] } },
          uniqueCustomers: { $addToSet: "$customer.mobile" },
        }
      },
      {
        $project: {
          _id: 0,
          orders: 1,
          grossSales: 1,
          shipping: 1,
          itemsSold: 1,
          uniqueCustomers: { $size: { $setDifference: ["$uniqueCustomers", [null, ""]] } },
        }
      }
    ]);

    const summary = summaryAgg?.[0] || {
      orders: 0, grossSales: 0, shipping: 0, itemsSold: 0, uniqueCustomers: 0
    };

    res.status(200).json({ summary, rows });
  } catch (error) {
    res.status(500).json({ message: "Error generating sales report", error: error.message });
  }
};

// export const getDashboardSummary = async (req, res) => {
//   try {
//     // status mapping:
//     // pending   -> New Orders
//     // processing-> Confirm Orders
//     // delivered -> Delivery Orders
//     // cancelled -> Cancel Orders

//     const [rows] = await Order.aggregate([
//       {
//         $group: {
//           _id: null,
//           totalOrders: { $sum: 1 },
//           pendingOrders: {
//             $sum: { $cond: [{ $eq: ["$orderStatus", "pending"] }, 1, 0] },
//           },
//           confirmOrders: {
//             $sum: { $cond: [{ $eq: ["$orderStatus", "processing"] }, 1, 0] },
//           },
//           deliveredOrders: {
//             $sum: { $cond: [{ $eq: ["$orderStatus", "delivered"] }, 1, 0] },
//           },
//           cancelledOrders: {
//             $sum: { $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 1, 0] },
//           },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           totalOrders: 1,
//           pendingOrders: 1,
//           confirmOrders: 1,
//           deliveredOrders: 1,
//           cancelledOrders: 1,
//         },
//       },
//     ]);

//     const data = rows || {
//       totalOrders: 0,
//       pendingOrders: 0,
//       confirmOrders: 0,
//       deliveredOrders: 0,
//       cancelledOrders: 0,
//     };

//     res.status(200).json({ success: true, data });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error fetching dashboard summary",
//       error: error.message,
//     });
//   }
// };
export const getDashboardSummary = async (req, res) => {
  try {
    // Users + Products count
    const [totalUsers, totalProducts] = await Promise.all([
      User.countDocuments({}),
      Product.countDocuments({}),
    ]);

    // Orders + Status counts + Total Sales
    const [rows] = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },

          pendingOrders: {
            $sum: { $cond: [{ $eq: ["$orderStatus", "pending"] }, 1, 0] },
          },
          confirmOrders: {
            $sum: { $cond: [{ $eq: ["$orderStatus", "processing"] }, 1, 0] },
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ["$orderStatus", "delivered"] }, 1, 0] },
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 1, 0] },
          },

          // ✅ Sales = sum(totalPrice)
          totalSales: { $sum: { $ifNull: ["$totalPrice", 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          pendingOrders: 1,
          confirmOrders: 1,
          deliveredOrders: 1,
          cancelledOrders: 1,
          totalSales: 1,
        },
      },
    ]);

    const agg = rows || {
      totalOrders: 0,
      pendingOrders: 0,
      confirmOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      totalSales: 0,
    };

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        ...agg,
      },
    });
  } catch (error) {
    console.log("getDashboardSummary error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching dashboard summary",
      error: error.message,
    });
  }
};


export const getDashboardStats = async (req, res) => {
  try {
    const [totalProducts, totalUsers] = await Promise.all([
      Product.countDocuments({}),
      User.countDocuments({}),
    ]);

    const [agg] = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSales: { $sum: { $ifNull: ["$totalPrice", 0] } },
        },
      },
      { $project: { _id: 0, totalOrders: 1, totalSales: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalUsers,
        totalOrders: agg?.totalOrders || 0,
        totalSales: agg?.totalSales || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
