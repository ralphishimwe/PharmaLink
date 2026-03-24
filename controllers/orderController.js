const Order = require("../models/orderModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");
const APIFeatures = require("../utils/apiFeautres");
const inventoryService = require("../services/inventoryService");
const orderService = require("../services/orderService");
const paymentService = require("../services/paymentService");
const getStaffPharmacy = require("../utils/getStaffPharmacy");

exports.placeOrder = catchAsync(async (req, res, next) => {
  const { pharmacyId, items, deliveryAddress, provider } =
    req.body || {};

  if (!deliveryAddress) {
    return next(new AppError("deliveryAddress is required", 400));
  }

  // 1) Validate inventory & price items from Inventory (server-side pricing)
  const { pricedItems, totalAmount } = await orderService.buildPricedOrderItems(
    {
      pharmacyId,
      items,
    },
  );

  // 2) Create order with proper defaults
  const order = await Order.create({
    pharmacy: pharmacyId,
    user: req.user.id,
    items: pricedItems,
    totalAmount,
    paymentStatus: "unpaid",
    orderStatus: "pending",
    deliveryAddress,
    stockDeducted: false,
  });

  // 3) Create a pending payment record for this order (Stripe is the default provider)
  await paymentService.getOrCreatePendingPayment({
    order,
    provider: provider || "stripe",
  });

  // 4) Return minimal payload for payment step
  res.status(201).json({
    status: "success",
    data: {
      orderId: order._id,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
    },
  });
});

exports.createOrder = catchAsync(async (req, res, next) => {
  // Validate stock exists and is sufficient (no deduction here).
  await inventoryService.validateStockForOrder({
    pharmacyId: req.body.pharmacy,
    items: req.body.items,
  });

  // Calculate subtotals for each item
  const items = req.body.items.map((item) => ({
    medicine: item.medicine,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.price * item.quantity,
  }));

  // Calculate totalAmount as sum of subtotals
  const totalAmount = items.reduce((total, item) => total + item.subtotal, 0);

  const doc = await Order.create({
    pharmacy: req.body.pharmacy,
    items: items,
    totalAmount: totalAmount,
    paymentStatus: req.body.paymentStatus,
    orderStatus: req.body.orderStatus,
    deliveryAddress: req.body.deliveryAddress,
    user: req.user.id,
  });

  res.status(200).json({
    status: "success",
    data: {
      Order: doc,
    },
  });
});

exports.deleteOrder = factory.deleteOne(Order);

// Custom getAll that populates user.fullname and pharmacy.name so the admin
// orders table shows real names instead of raw ObjectIds.
exports.getAllOrders = catchAsync(async (req, res, next) => {
  const baseQuery = Order.find()
    .populate({ path: "user",     select: "fullname" })
    .populate({ path: "pharmacy", select: "name"     });

  const features = new APIFeatures(baseQuery, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const doc = await features.query;

  res.status(200).json({
    status: "success",
    results: doc.length,
    data: { data: doc },
  });
});

/** List orders for the logged-in user (newest first). */
exports.getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({ path: "pharmacy", select: "name" });

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { data: orders },
  });
});

/**
 * Cancel an order while it is still pending (not paid / not fulfilled).
 * Only the order owner (or admin) can cancel.
 */
exports.cancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("No Order Found with that Id", 404));
  }

  const isOwner = order.user?.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    return next(new AppError("You cannot cancel this order", 403));
  }

  if (order.orderStatus !== "pending") {
    return next(
      new AppError("Only pending orders can be cancelled", 400),
    );
  }

  order.orderStatus = "cancelled";
  await order.save({ validateBeforeSave: true });

  res.status(200).json({
    status: "success",
    data: { data: order },
  });
});

/**
 * Staff: get all orders for the staff user's assigned pharmacy.
 * GET /api/v1/orders/pharmacy-orders
 */
exports.getPharmacyOrders = catchAsync(async (req, res, next) => {
  const pharmacy = await getStaffPharmacy(req.user.id);

  const orders = await Order.find({ pharmacy: pharmacy._id })
    .sort({ createdAt: -1 })
    .populate({ path: "pharmacy", select: "name" });

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { data: orders },
  });
});

/**
 * Staff/admin update wrapper:
 * - Staff can only update `orderStatus`
 * - Staff cannot update orders that don't belong to their pharmacy
 * PATCH /api/v1/orders/:id
 */
exports.updateOrderStatusForStaffOrAdmin = catchAsync(
  async (req, res, next) => {
    // Admin keeps current update behavior
    if (req.user.role !== "staff") return exports.updateOrder(req, res, next);

    const pharmacy = await getStaffPharmacy(req.user.id);

    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError("No Order Found with that Id", 404));

    // Ensure staff can only access their own pharmacy orders
    if (String(order.pharmacy) !== String(pharmacy._id)) {
      return next(new AppError("Unauthorized", 401));
    }

    // Only allow orderStatus to be updated
    const allowedFields = ["orderStatus"];
    const incomingFields = Object.keys(req.body || {});
    const hasOtherFields = incomingFields.some(
      (field) => !allowedFields.includes(field),
    );
    if (hasOtherFields) {
      return next(new AppError("Only orderStatus can be updated", 400));
    }
    if (!req.body.orderStatus) {
      return next(new AppError("orderStatus is required", 400));
    }

    order.orderStatus = req.body.orderStatus;
    await order.save({ validateBeforeSave: true });

    return res.status(200).json({
      status: "success",
      data: { data: order },
    });
  },
);

/**
 * Staff/admin delete wrapper.
 * Staff can only delete their own pharmacy orders.
 * PATCH requirement doesn't mention delete, but current routes allow staff/admin delete.
 */
exports.deleteOrderForStaffOrAdmin = catchAsync(async (req, res, next) => {
  if (req.user.role !== "staff") return exports.deleteOrder(req, res, next);

  const pharmacy = await getStaffPharmacy(req.user.id);
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError("No Order Found with that Id", 404));

  if (String(order.pharmacy) !== String(pharmacy._id)) {
    return next(new AppError("Unauthorized", 401));
  }

  await order.deleteOne();
  res.status(204).json({ status: "success", data: null });
});
exports.updateOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("No Order Found with that Id", 404));
  }

  // Update other fields if provided
  if (req.body.paymentStatus) order.paymentStatus = req.body.paymentStatus;
  if (req.body.orderStatus) order.orderStatus = req.body.orderStatus;
  if (req.body.deliveryAddress)
    order.deliveryAddress = req.body.deliveryAddress;

  // Update items if provided
  if (req.body.items && Array.isArray(req.body.items)) {
    req.body.items.forEach((updateItem, index) => {
      if (order.items[index]) {
        order.items[index].quantity = updateItem.quantity;
        order.items[index].subtotal =
          order.items[index].price * updateItem.quantity;
      }
    });

    // Recalculate totalAmount
    order.totalAmount = order.items.reduce(
      (total, item) => total + item.subtotal,
      0,
    );

    // Mark items as modified
    order.markModified("items");
  }

  await order.save({ validateBeforeSave: true });

  res.status(200).json({
    status: "success",
    data: {
      Order: order,
    },
  });
});
exports.getOrder = factory.getOne(Order, {
  path: "pharmacy items.medicine user",
  select: "name fullname",
});
