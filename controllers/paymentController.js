const Payment = require("../models/paymentModel");
const mongoose = require("mongoose");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");
const inventoryService = require("../services/inventoryService");

exports.createPayment = factory.createOne(Payment);
exports.getAllPayments = factory.getAll(Payment);
exports.updatePayment = catchAsync(async (req, res, next) => {
  // Custom update so we can react to "successful" payments and deduct stock safely.
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(new AppError("No Payment Found with that Id", 404));
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
exports.deletePayment = factory.deleteOne(Payment);
exports.getPayment = factory.getOne(Payment)