// backend/routes/orderRoutes.js
//
// Order CREATION now happens through /api/payment (create-order + verify) so
// that every order is backed by a verified payment. This file only handles
// reading orders and admin order management.
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

const authMiddleware = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");

// Customer views THEIR OWN orders — filtered by the verified token's email,
// never a client-supplied identifier.
router.get("/orders", authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(400).json({ error: "User identification failed or email not found in token." });
    }
    const orders = await Order.find({ "userDetails.email": userEmail }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("GET /api/orders - error:", error.message, error.stack);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// Admin-only: aggregate sales figures from successfully placed orders.
router.get("/stock-summary", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const salesData = await Order.aggregate([
      { $match: { status: { $in: ["Placed", "Completed"] } } },
      { $unwind: "$cartItems" },
      { $group: { _id: "$cartItems.name", totalSold: { $sum: "$cartItems.quantity" } } },
      { $project: { productName: "$_id", totalSold: 1, _id: 0 } }
    ]);
    res.status(200).json(salesData);
  } catch (error) {
    console.error("GET /api/stock-summary - error:", error.message, error.stack);
    res.status(500).json({ error: "Failed to fetch stock summary." });
  }
});

// Admin-only: every successfully placed order.
router.get("/order-history", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ status: { $in: ["Placed", "Completed"] } }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("GET /api/order-history - error:", error.message, error.stack);
    res.status(500).json({ error: "Failed to fetch placed orders." });
  }
});

// Admin-only: mark an order completed (delivered).
router.put("/orders/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    if (order.status !== "Placed") {
      return res.status(409).json({ message: `Cannot complete an order with status "${order.status}".` });
    }
    order.status = "Completed";
    await order.save();
    res.status(200).json({ message: "Order marked as completed.", order });
  } catch (error) {
    console.error(`PUT /api/orders/${req.params.id} - error:`, error);
    res.status(500).json({ error: "Failed to update order status." });
  }
});

// Admin-only: full order list for the admin dashboard (includes all statuses).
router.get("/admin/all-orders", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const allOrders = await Order.find({}).sort({ createdAt: -1 });
    res.status(200).json(allOrders);
  } catch (error) {
    console.error("GET /api/admin/all-orders - error:", error.message, error.stack);
    res.status(500).json({ error: "Failed to fetch all orders for admin panel." });
  }
});

module.exports = router;
