const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  productName: { type: String, required: false },
  description: { type: String, required: false },
  totalPrice: { type: Number, required: true },
  quantity: { type: Number, required: false },
  userDetails: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
  },
  cartItems: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
    },
  ],
  userId: { type: String, required: false },

  // "Awaiting Payment" -> reserved stock, Razorpay order created, waiting on checkout.
  // "Placed"           -> payment verified; this is a real, fulfillable order.
  // "Payment Failed"   -> signature verification failed or payment was rejected; stock released.
  // "Completed"        -> fulfilled/delivered by an admin.
  status: {
    type: String,
    enum: ["Awaiting Payment", "Placed", "Payment Failed", "Completed"],
    default: "Awaiting Payment",
  },

  paymentStatus: {
    type: String,
    enum: ["Created", "Paid", "Failed"],
    default: "Created",
  },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },

  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
