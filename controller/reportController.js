import { Order, Product } from "../model/index.model.js";

// GET /api/reports/admin-overview
export const getAdminOverview = async (req, res) => {
  try {
    // Orders counts
    const [pendingOrders, processingOrders, deliveredOrders, cancelledOrders] =
      await Promise.all([
        Order.countDocuments({ orderStatus: "pending" }),
        Order.countDocuments({ orderStatus: "processing" }),
        Order.countDocuments({ orderStatus: "delivered" }),
        Order.countDocuments({ orderStatus: "cancelled" }),
      ]);

    // Unpaid orders count (paymentStatus field তোমার আছে)
    const unpaidOrders = await Order.countDocuments({ paymentStatus: "unpaid" });

    // Product stock alerts (তোমার Product model এ field নাম বিভিন্ন হতে পারে: quantity / qty / stock)
    // নিচে safe fallback দিলাম:
    const products = await Product.find({}, { productName: 1, quantity: 1, qty: 1, stock: 1 })
      .lean()
      .limit(5000);

    const getQty = (p) => {
      if (typeof p.quantity === "number") return p.quantity;
      if (typeof p.qty === "number") return p.qty;
      if (typeof p.stock === "number") return p.stock;
      return 0;
    };

    const LOW_STOCK_THRESHOLD = 5;

    let outOfStock = 0;
    let lowStock = 0;

    for (const p of products) {
      const q = getQty(p);
      if (q <= 0) outOfStock++;
      else if (q <= LOW_STOCK_THRESHOLD) lowStock++;
    }

    return res.status(200).json({
      summary: {
        orders: {
          pending: pendingOrders,
          processing: processingOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },
        payment: {
          unpaidOrders,
        },
        stock: {
          lowStock,
          outOfStock,
          lowStockThreshold: LOW_STOCK_THRESHOLD,
        },
      },
    });
  } catch (error) {
    console.error("getAdminOverview error:", error);
    res.status(500).json({ message: "Failed to load admin overview", error: error.message });
  }
};

// Asia/Dhaka day range (server timezone যাই হোক, BD day হিসাব হবে)
function getDhakaDayRange(date = new Date()) {
  // trick: Dhaka offset +06:00 (BD has no DST)
  // We'll compute "today" in Dhaka by shifting time then building UTC range.
  const now = date;
  const dhakaOffsetMin = 6 * 60;

  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const dhakaMs = utcMs + dhakaOffsetMin * 60 * 1000;
  const dhaka = new Date(dhakaMs);

  const y = dhaka.getUTCFullYear();
  const m = dhaka.getUTCMonth();
  const d = dhaka.getUTCDate();

  // Dhaka day start in Dhaka -> convert back to UTC
  const startDhakaMs = Date.UTC(y, m, d, 0, 0, 0);
  const endDhakaMs = Date.UTC(y, m, d + 1, 0, 0, 0);

  // convert Dhaka-based UTC back to real UTC instants
  const startUtc = new Date(startDhakaMs - dhakaOffsetMin * 60 * 1000);
  const endUtc = new Date(endDhakaMs - dhakaOffsetMin * 60 * 1000);

  return { startUtc, endUtc };
}

export const getTodayOrders = async (req, res) => {
  try {
    const { startUtc, endUtc } = getDhakaDayRange(new Date());

    const orders = await Order.find({
      createdAt: { $gte: startUtc, $lt: endUtc },
    })
      .populate({ path: "products.product", select: "productName productImage sku" })
      .populate({ path: "user", select: "name email mobile" })
      .sort({ createdAt: -1 });

    const summary = {
      orders: orders.length,
      grossSales: orders.reduce((s, o) => s + (Number(o.totalPrice) || 0), 0),
      shipping: orders.reduce((s, o) => s + (Number(o.shippingCost) || 0), 0),
      itemsSold: orders.reduce(
        (s, o) => s + (o.products || []).reduce((x, it) => x + (Number(it.quantity) || 0), 0),
        0
      ),
      pending: orders.filter((o) => o.orderStatus === "pending").length,
      processing: orders.filter((o) => o.orderStatus === "processing").length,
      delivered: orders.filter((o) => o.orderStatus === "delivered").length,
      cancelled: orders.filter((o) => o.orderStatus === "cancelled").length,
    };

    res.json({
      range: { start: startUtc, end: endUtc },
      summary,
      orders,
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to load today orders", error: e.message });
  }
};
