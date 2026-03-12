const mongoose = require("mongoose");
const Payment = require("../models/paymentModel");
const Order = require("../models/orderModel");
const AppError = require("../utils/appError");
const inventoryService = require("./inventoryService");
const { getProvider } = require("./paymentProviders/providerFactory");

exports.getOrCreatePendingPayment = async ({
  order,
  paymentMethod,
  provider = "irembopay",
  session,
} = {}) => {
  if (!order?._id) throw new AppError("Valid order is required", 400);

  const existingPending = await Payment.findOne({
    order: order._id,
    status: "pending",
  }).session(session || null);

  if (existingPending) return existingPending;

  if (!paymentMethod) throw new AppError("paymentMethod is required", 400);

  return await Payment.create(
    [
      {
        order: order._id,
        amount: order.totalAmount,
        paymentMethod,
        provider,
        status: "pending",
      },
    ],
    session ? { session } : undefined,
  ).then((docs) => docs[0]);
};

exports.initiatePaymentWithProvider = async ({ payment, order } = {}) => {
  const providerModule = getProvider(payment.provider);
  const initiation = await providerModule.initiate({
    orderId: String(order._id),
    amount: order.totalAmount,
  });

  payment.providerReference = initiation.providerReference;
  payment.paymentUrl = initiation.paymentUrl;
  await payment.save({ validateBeforeSave: false });

  return initiation;
};

exports.applyPaymentResult = async ({
  orderId,
  transactionId,
  status,
  provider = "irembopay",
} = {}) => {
  if (!orderId) throw new AppError("orderId is required", 400);
  if (!transactionId) throw new AppError("transactionId is required", 400);
  if (!["successful", "failed"].includes(status)) {
    throw new AppError("status must be either successful or failed", 400);
  }

  const session = await mongoose.startSession();
  try {
    let updatedPayment;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new AppError("No Order Found with that Id", 404);

      // Prefer matching an existing pending payment for this order/provider.
      const payment =
        (await Payment.findOne({
          order: order._id,
          provider,
          status: "pending",
        }).session(session)) ||
        (await Payment.findOne({ order: order._id, provider }).session(session));

      if (!payment) throw new AppError("No Payment Found for this order", 404);

      // If already successful, treat webhook retries as idempotent.
      if (payment.status === "successful") {
        updatedPayment = payment;
        return;
      }

      payment.status = status;
      payment.transactionID = transactionId;
      if (status === "successful") payment.paidAt = new Date();
      updatedPayment = await payment.save({ session, validateBeforeSave: true });

      if (status === "successful") {
        // Deduct inventory atomically + idempotently
        const updatedOrder = await inventoryService.deductStockForOrder({
          orderId: order._id,
          session,
        });

        if (updatedOrder.paymentStatus !== "paid") updatedOrder.paymentStatus = "paid";
        if (updatedOrder.orderStatus === "pending") updatedOrder.orderStatus = "confirmed";
        await updatedOrder.save({ session, validateBeforeSave: false });
      }
    });

    return updatedPayment;
  } finally {
    session.endSession();
  }
};

