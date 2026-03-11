const mongoose = require("mongoose");
const Inventory = require("../models/inventoryModel");
const Order = require("../models/orderModel");
const AppError = require("../utils/appError");

/**
 * Validate stock availability for an order BEFORE creating it.
 * This does not reserve/deduct stock; it only checks current inventory.
 *
 * items shape: [{ medicine: ObjectId|string, quantity: number }]
 */
exports.validateStockForOrder = async ({ pharmacyId, items, session } = {}) => {
  if (!pharmacyId) throw new AppError("pharmacyId is required for stock validation", 400);
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("Order items are required for stock validation", 400);
  }

  // Basic input validation and early failure for malformed payloads
  items.forEach((item, idx) => {
    if (!item?.medicine) {
      throw new AppError(`Order item at index ${idx} is missing medicine`, 400);
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new AppError(`Order item at index ${idx} has invalid quantity`, 400);
    }
  });

  // Check each item exists in inventory for the given pharmacy and has enough stock.
  // NOTE: This is a pre-check; final enforcement happens during deduction via atomic updates.
  await Promise.all(
    items.map(async (item) => {
      const inv = await Inventory.findOne({
        pharmacy: pharmacyId,
        medicine: item.medicine,
        isAvailable: true,
      })
        .select("quantity")
        .session(session || null);

      if (!inv) {
        throw new AppError(
          "Requested medicine is not available in this pharmacy inventory",
          404,
        );
      }

      if (inv.quantity < item.quantity) {
        throw new AppError(
          "Insufficient stock for one or more requested medicines",
          409,
        );
      }
    }),
  );
};

/**
 * Atomically deduct inventory for all items in an order.
 * This is the source of truth for preventing negative stock and handling concurrency.
 *
 * - Uses conditional updates: { quantity: { $gte: needed } } + $inc: -needed
 * - Runs all deductions in a transaction so multi-item orders are all-or-nothing.
 * - Idempotent via Order.stockDeducted flag: safe for webhook retries.
 */
exports.deductStockForOrder = async ({ orderId, session: externalSession } = {}) => {
  if (!orderId) throw new AppError("orderId is required to deduct stock", 400);

  const run = async (session) => {
    const order = await Order.findById(orderId).session(session || null);
    if (!order) throw new AppError("No Order Found with that Id", 404);

    if (order.stockDeducted) {
      // Idempotency: webhook/confirm endpoints may be called multiple times.
      return order;
    }

    // Deduct each item atomically; if any item cannot be deducted, abort the transaction.
    for (const item of order.items) {
      const updatedInv = await Inventory.findOneAndUpdate(
        {
          pharmacy: order.pharmacy,
          medicine: item.medicine,
          isAvailable: true,
          quantity: { $gte: item.quantity },
        },
        { $inc: { quantity: -item.quantity } },
        { new: true, session: session || undefined },
      );

      if (!updatedInv) {
        throw new AppError(
          "Insufficient stock (or item not found) while confirming payment",
          409,
        );
      }

      // Optional: if stock hits zero, mark unavailable (keeps future checks fast/clear).
      if (updatedInv.quantity === 0 && updatedInv.isAvailable) {
        updatedInv.isAvailable = false;
        await updatedInv.save({ session: session || undefined, validateBeforeSave: false });
      }
    }

    order.stockDeducted = true;
    return await order.save({ session: session || undefined, validateBeforeSave: false });
  };

  if (externalSession) return await run(externalSession);

  const session = await mongoose.startSession();
  try {
    let updatedOrder;
    await session.withTransaction(async () => {
      updatedOrder = await run(session);
    });
    return updatedOrder;
  } finally {
    session.endSession();
  }
};

