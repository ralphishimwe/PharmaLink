const Inventory = require("../models/inventoryModel");
const AppError = require("../utils/appError");

/**
 * Build priced order items from Inventory (single pharmacy).
 * Ensures:
 * - each medicine exists in the pharmacy inventory
 * - requested quantity <= available quantity
 * - price comes from Inventory (price at purchase time)
 *
 * Input items shape: [{ medicineId, quantity }]
 * Output items shape: [{ medicine, quantity, price, subtotal }]
 */
exports.buildPricedOrderItems = async ({ pharmacyId, items } = {}) => {
  if (!pharmacyId) throw new AppError("pharmacyId is required", 400);
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("items must be a non-empty array", 400);
  }

  // Normalize and merge duplicates (if same medicine appears multiple times).
  const requestedQtyByMedicineId = new Map();
  for (let i = 0; i < items.length; i += 1) {
    const medId = items[i]?.medicineId || items[i]?.medicine;
    const qty = items[i]?.quantity;

    if (!medId) throw new AppError(`items[${i}].medicineId is required`, 400);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new AppError(`items[${i}].quantity must be a positive number`, 400);
    }

    const key = String(medId);
    requestedQtyByMedicineId.set(key, (requestedQtyByMedicineId.get(key) || 0) + qty);
  }

  const medicineIds = Array.from(requestedQtyByMedicineId.keys());

  const inventories = await Inventory.find({
    pharmacy: pharmacyId,
    medicine: { $in: medicineIds },
    isAvailable: true,
  }).select("medicine price quantity");

  const inventoryByMedicineId = new Map(
    inventories.map((inv) => [String(inv.medicine), inv]),
  );

  // Validate existence + quantity for each requested medicine
  for (const [medicineId, requestedQty] of requestedQtyByMedicineId.entries()) {
    const inv = inventoryByMedicineId.get(String(medicineId));
    if (!inv) {
      throw new AppError("Requested medicine is not available in this pharmacy inventory", 404);
    }
    if (inv.quantity < requestedQty) {
      throw new AppError("Insufficient stock for one or more requested medicines", 409);
    }
  }

  // Build final order items (use Inventory price at time of purchase)
  const pricedItems = medicineIds.map((medicineId) => {
    const inv = inventoryByMedicineId.get(String(medicineId));
    const quantity = requestedQtyByMedicineId.get(String(medicineId));
    const price = inv.price;
    return {
      medicine: inv.medicine,
      quantity,
      price,
      subtotal: price * quantity,
    };
  });

  const totalAmount = pricedItems.reduce((sum, it) => sum + it.subtotal, 0);

  return { pricedItems, totalAmount };
};

