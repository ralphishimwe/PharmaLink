const Inventory = require("../models/inventoryModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");

// Nested read: all inventory entries for a specific pharmacy, with
// optional search/sort on medicine name and price.
exports.getPharmacyInventories = catchAsync(async (req, res, next) => {
  const pharmacyId = req.params.id;
  const { search, sort = "name", order = "asc" } = req.query;

  // 1) Base query: all inventory for this pharmacy (only available stock)
  let inventories = await Inventory.find({
    pharmacy: pharmacyId,
    isAvailable: true,
  }).populate({
    path: "medicine",
    select: "name dosageForm",
  });

  // 2) Filter by medicine name (case-insensitive "contains" search)
  if (search) {
    const term = search.toLowerCase();
    inventories = inventories.filter(
      (inv) =>
        inv.medicine &&
        typeof inv.medicine.name === "string" &&
        inv.medicine.name.toLowerCase().includes(term),
    );
  }

  // 3) Sorting:
  // - sort=name  -> sort by populated medicine.name
  // - sort=price -> sort by inventory price
  // Default: medicine name ascending
  const direction = order === "desc" ? -1 : 1;
  inventories.sort((a, b) => {
    if (sort === "price") {
      return (a.price - b.price) * direction;
    }

    const nameA = a.medicine?.name || "";
    const nameB = b.medicine?.name || "";
    if (nameA < nameB) return -1 * direction;
    if (nameA > nameB) return 1 * direction;
    return 0;
  });

  // 4) Shape response to only include the fields needed by clients
  const data = inventories.map((inv) => ({
    medicineName: inv.medicine?.name,
    dosageForm: inv.medicine?.dosageForm,
    price: inv.price,
    quantity: inv.quantity,
    expiryDate: inv.expiryDate || null,
  }));

  res.status(200).json({
    status: "success",
    results: data.length,
    data,
  });
});

exports.deleteInventory = factory.deleteOne(Inventory);
exports.createInventory = factory.createOne(Inventory);
exports.getAllInventories = factory.getAll(Inventory);
exports.updateInventory = factory.updateOne(Inventory);
exports.getInventory = factory.getOne(Inventory, {
  path: "pharmacy medicine",
  select: "name",
});
