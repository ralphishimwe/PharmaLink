const Medicine = require("../models/medicineModel");
const Inventory = require("../models/inventoryModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");


exports.createMedicine = factory.createOne(Medicine);
exports.getAllMedicines = factory.getAll(Medicine);
exports.updateMedicine = factory.updateOne(Medicine);
exports.deleteMedicine = factory.deleteOne(Medicine);
exports.getMedicine = factory.getOne(Medicine);

// Global medicine search:
// - Search medicines by (partial, case-insensitive) name
// - Find all pharmacies that currently have those medicines in stock (quantity > 0)
// - Return flattened results with medicine + pharmacy info, price, quantity, expiryDate
exports.searchMedicines = catchAsync(async (req, res, next) => {
  const { name } = req.query;
  const { sort = "price", order = "asc" } = req.query;

  if (!name) {
    return next(new AppError("Query parameter 'name' is required", 400));
  }

  // 1) Find medicines whose name matches the search term (case-insensitive)
  const medicines = await Medicine.find({
    name: { $regex: name, $options: "i" },
  }).select("_id name");

  if (!medicines.length) {
    return res.status(200).json({
      status: "success",
      results: 0,
      data: [],
    });
  }

  const medicineIds = medicines.map((m) => m._id);

  // 2) Find all inventory records for those medicines where there is stock available
  const inventories = await Inventory.find({
    medicine: { $in: medicineIds },
    quantity: { $gt: 0 },
    isAvailable: true,
  })
    .populate({ path: "medicine", select: "name" })
    .populate({ path: "pharmacy", select: "name address" });

  // 3) Shape the response: one entry per inventory row (ids for checkout + navigation)
  let results = inventories.map((inv) => ({
    inventoryId: inv._id,
    medicineId: inv.medicine?._id,
    pharmacyId: inv.pharmacy?._id,
    medicineName: inv.medicine?.name,
    pharmacyName: inv.pharmacy?.name,
    pharmacyAddress: inv.pharmacy?.address,
    price: inv.price,
    quantity: inv.quantity,
    expiryDate: inv.expiryDate || null,
  }));

  // 4) Sorting
  // sort=price     -> by price
  // sort=pharmacy  -> by pharmacyName
  // sort=medicine  -> by medicineName
  const direction = order === "desc" ? -1 : 1;
  results.sort((a, b) => {
    if (sort === "pharmacy") {
      const A = a.pharmacyName || "";
      const B = b.pharmacyName || "";
      if (A < B) return -1 * direction;
      if (A > B) return 1 * direction;
      return 0;
    }

    if (sort === "medicine") {
      const A = a.medicineName || "";
      const B = b.medicineName || "";
      if (A < B) return -1 * direction;
      if (A > B) return 1 * direction;
      return 0;
    }

    // Default: sort by price ascending
    return (a.price - b.price) * direction;
  });

  res.status(200).json({
    status: "success",
    results: results.length,
    data: results,
  });
});
