const Order = require("../models/orderModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");

exports.createOrder = catchAsync(async (req, res, next) => {
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
exports.getAllOrders = factory.getAll(Order);
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
