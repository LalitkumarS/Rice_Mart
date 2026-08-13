// backend/routes/paymentRoutes.js
//
// Two-step flow, both steps require a logged-in user:
//
//   1. POST /api/payment/create-order
//      Server computes the real price from data/products.js (never trusts a
//      client-sent price), atomically reserves stock, opens a Razorpay order
//      for that exact amount, and stores a matching "Awaiting Payment" Order
//      document. Returns just enough for the frontend to open Razorpay
//      Checkout.
//
//   2. POST /api/payment/verify
//      After Razorpay Checkout succeeds in the browser, the frontend sends
//      back Razorpay's payment id + signature. The server recomputes the
//      HMAC signature itself and only marks the order "Placed" if it
//      matches. A client claiming "payment succeeded" is NEVER trusted on
//      its own — the signature is the only real proof.
//
// Known limitation (documented, not fixed here): if a user closes the tab
// mid-checkout, their order sits at "Awaiting Payment" holding reserved
// stock indefinitely. In a real deployment, add a scheduled job that
// releases stock for orders older than ~30 minutes still in that state
// (or use a Razorpay webhook for `payment.failed` / order expiry).

const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const router = express.Router();

const Order = require('../models/Order');
const Stock = require('../models/Stock');
const authMiddleware = require('../middleware/auth');
const { buildLineItems, reserveStock, releaseStock, ValidationError } = require('../utils/orderPricing');

function getRazorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set in backend/.env');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

router.post('/create-order', authMiddleware, async (req, res) => {
  const { productName, quantity, cartItems, description, userDetails: formSubmittedDetails } = req.body;
  const authenticatedUserEmail = req.user?.email;
  const authenticatedUserId = req.user?.uid;

  if (!authenticatedUserEmail) {
    return res.status(401).json({ message: 'User authentication error.' });
  }
  if (!formSubmittedDetails || !formSubmittedDetails.name || !formSubmittedDetails.phone || !formSubmittedDetails.address) {
    return res.status(400).json({ message: 'Name, phone and address are required.' });
  }

  let lineItems, totalPrice;
  try {
    ({ lineItems, totalPrice } = buildLineItems({ productName, quantity, cartItems }));
  } catch (err) {
    if (err instanceof ValidationError) return res.status(400).json({ message: err.message });
    throw err;
  }

  try {
    await reserveStock(Stock, lineItems);
  } catch (err) {
    return res.status(409).json({ message: err.message });
  }

  let razorpayOrder;
  try {
    const razorpay = getRazorpayClient();
    razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalPrice * 100), // Razorpay wants the amount in paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    });
  } catch (err) {
    await releaseStock(Stock, lineItems);
    console.error('Razorpay order creation failed:', err.message);
    return res.status(502).json({ message: 'Payment gateway error. Please try again.' });
  }

  const isCart = Boolean(cartItems && cartItems.length > 0);
  const newOrder = new Order({
    productName: isCart ? undefined : productName,
    description,
    totalPrice,
    quantity: isCart ? undefined : lineItems[0].quantity,
    userDetails: {
      email: authenticatedUserEmail,
      name: formSubmittedDetails.name,
      phone: formSubmittedDetails.phone,
      address: formSubmittedDetails.address,
    },
    cartItems: isCart ? lineItems : [],
    userId: authenticatedUserId,
    status: 'Awaiting Payment',
    paymentStatus: 'Created',
    razorpayOrderId: razorpayOrder.id,
  });

  try {
    await newOrder.save();
  } catch (err) {
    await releaseStock(Stock, lineItems);
    console.error('Failed to save pending order:', err);
    return res.status(500).json({ message: 'Failed to initiate order.' });
  }

  res.status(201).json({
    mongoOrderId: newOrder._id,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

router.post('/verify', authMiddleware, async (req, res) => {
  const { mongoOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!mongoOrderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Missing payment verification fields.' });
  }

  const order = await Order.findById(mongoOrderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }
  // Ownership check: this order must belong to whoever is presenting the token.
  if (order.userDetails.email !== req.user?.email) {
    return res.status(403).json({ message: 'This order does not belong to you.' });
  }
  if (order.razorpayOrderId !== razorpay_order_id) {
    return res.status(400).json({ message: 'Order/payment mismatch.' });
  }
  if (order.paymentStatus === 'Paid') {
    // Already verified (e.g. duplicate callback) — just confirm, don't re-charge stock etc.
    return res.status(200).json({ message: 'Payment already verified.', order });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    order.status = 'Payment Failed';
    order.paymentStatus = 'Failed';
    await order.save();
    const itemsToRelease = order.cartItems.length > 0
      ? order.cartItems
      : [{ name: order.productName, quantity: order.quantity }];
    await releaseStock(Stock, itemsToRelease);
    console.warn(`Payment signature mismatch for order ${order._id}.`);
    return res.status(400).json({ message: 'Payment verification failed.' });
  }

  order.status = 'Placed';
  order.paymentStatus = 'Paid';
  order.razorpayPaymentId = razorpay_payment_id;
  order.razorpaySignature = razorpay_signature;
  await order.save();

  res.status(200).json({ message: 'Payment verified, order placed.', order });
});

module.exports = router;
