const Payment = require("../models/paymentModel");
const Order = require("../models/orderModel");
const mongoose = require("mongoose");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");
const inventoryService = require("../services/inventoryService");
const paymentService = require("../services/paymentService");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const getStaffPharmacy = require("../utils/getStaffPharmacy");

exports.createPayment = factory.createOne(Payment);
exports.getAllPayments = factory.getAll(Payment);

exports.initiatePayment = catchAsync(async (req, res, next) => {
  const { orderId, provider } = req.body || {};
  if (!orderId) return next(new AppError("orderId is required", 400));

  // Populate medicine details for Stripe checkout line items
  const order = await Order.findById(orderId).populate("items.medicine");
  if (!order) return next(new AppError("No Order Found with that Id", 404));

  if (order.paymentStatus === "paid") {
    return next(new AppError("Payment already completed for this order", 409));
  }

  // Create or retrieve pending payment record
  const payment = await paymentService.getOrCreatePendingPayment({
    order,
    provider: provider || "stripe", // Default to stripe for new payments
  });

  // Initiate payment with Stripe (creates Checkout Session)
  const initiation = await paymentService.initiatePaymentWithProvider({
    payment,
    order,
  });

  // Return Stripe checkout URL for frontend redirect
  res.status(200).json({
    status: "success",
    data: {
      checkoutUrl: initiation.paymentUrl, // Frontend redirects user here
      sessionId: initiation.sessionId,
      orderId: orderId,
      message: initiation.message,
    },
  });
});

exports.webhook = catchAsync(async (req, res, next) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify Stripe webhook signature to ensure request authenticity
    // Stripe signs webhooks with the endpoint secret for security
    const rawBody = req.rawBody || req.body;
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  // This event is sent when payment is successfully completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Extract orderId from metadata (set during session creation)
    const orderId = session.metadata?.orderId || session.client_reference_id;
    const transactionId = session.payment_intent; // Stripe payment intent ID

    if (!orderId || !transactionId) {
      console.error("Missing orderId or transactionId in webhook");
      return res.status(400).send("Missing required data");
    }

    // Update payment record and trigger inventory deduction
    // This will mark payment as successful, update order status, and reduce inventory
    await paymentService.applyPaymentResult({
      orderId,
      transactionId,
      status: "successful",
      provider: "stripe",
    });

    console.log(
      `Payment successful for order ${orderId}, transaction ${transactionId}`,
    );
  }

  // Return 200 to acknowledge receipt of the webhook
  res.status(200).json({ received: true });
});

exports.updatePayment = catchAsync(async (req, res, next) => {
  // Custom update so we can react to "successful" payments and deduct stock safely.
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(new AppError("No Payment Found with that Id", 404));
  }

  // Staff can only update payments that belong to their assigned pharmacy
  if (req.user && req.user.role === "staff") {
    const pharmacy = await getStaffPharmacy(req.user.id);
    const order = await Order.findById(payment.order);
    if (!order || String(order.pharmacy) !== String(pharmacy._id)) {
      return next(new AppError("Unauthorized", 401));
    }
  }

  const previousStatus = payment.status;

  // Apply allowed updates
  Object.keys(req.body || {}).forEach((key) => {
    payment[key] = req.body[key];
  });

  await payment.save({ validateBeforeSave: true });

  // Only deduct stock when payment becomes successful (and only once).
  if (previousStatus !== "successful" && payment.status === "successful") {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Deduct stock (idempotent via Order.stockDeducted)
        const order = await inventoryService.deductStockForOrder({
          orderId: payment.order,
          session,
        });

        // Update order status fields after stock deduction succeeds
        if (order.paymentStatus !== "paid") order.paymentStatus = "paid";
        if (order.orderStatus === "pending") order.orderStatus = "confirmed";
        await order.save({ session, validateBeforeSave: false });
      });
    } finally {
      session.endSession();
    }
  }

  res.status(200).json({
    status: "success",
    data: {
      data: payment,
    },
  });
});

/**
 * Staff: get payments for the staff user's assigned pharmacy.
 * GET /api/v1/payments/pharmacy
 */
exports.getPharmacyPayments = catchAsync(async (req, res, next) => {
  const pharmacy = await getStaffPharmacy(req.user.id);

  const orders = await Order.find({ pharmacy: pharmacy._id }).select("_id");
  const orderIds = orders.map((o) => o._id);

  const payments = await Payment.find({ order: { $in: orderIds } }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    status: "success",
    results: payments.length,
    data: { data: payments },
  });
});
exports.deletePayment = factory.deleteOne(Payment);
exports.getPayment = factory.getOne(Payment);
