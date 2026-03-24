const Inventory = require("../models/inventoryModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");
const AppError = require("../utils/appError");
const getStaffPharmacy = require("../utils/getStaffPharmacy");
const APIFeatures = require("../utils/apiFeautres");

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
    select: "name dosageForm images",
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
    inventoryId: inv._id,
    medicineId: inv.medicine?._id,
    medicineName: inv.medicine?.name,
    dosageForm: inv.medicine?.dosageForm,
    image: inv.medicine?.images?.[0] || null,
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

/**
 * Staff: get inventory for the staff user's assigned pharmacy.
 * GET /api/v1/inventories/my
 */
exports.getMyInventory = catchAsync(async (req, res, next) => {
  const pharmacy = await getStaffPharmacy(req.user.id);

  const inventories = await Inventory.find({ pharmacy: pharmacy._id }).populate({
    path: "medicine",
    select: "name dosageForm images",
  });

  res.status(200).json({
    status: "success",
    results: inventories.length,
    data: { data: inventories },
  });
});

/**
 * Staff/admin wrapper for inventory creation.
 * Staff cannot choose pharmacy from frontend; their pharmacy is derived from Pharmacy.staff.
 */
exports.createInventoryForStaffOrAdmin = catchAsync(
  async (req, res, next) => {
    if (req.user.role !== "staff")
      return factory.createOne(Inventory)(req, res, next);

    const pharmacy = await getStaffPharmacy(req.user.id);

    // Override pharmacy so staff can only create inventory in their own pharmacy.
    const { pharmacy: _ignored, ...rest } = req.body || {};

    const created = await Inventory.create({ ...rest, pharmacy: pharmacy._id });

    return res.status(201).json({
      status: "success",
      data: {
        data: created,
      },
    });
  },
);

/**
 * Staff/admin wrapper for inventory update.
 * Staff can only update their own pharmacy inventory.
 */
exports.updateInventoryForStaffOrAdmin = catchAsync(async (req, res, next) => {
  if (req.user.role !== "staff") return factory.updateOne(Inventory)(req, res, next);

  const pharmacy = await getStaffPharmacy(req.user.id);
  const inv = await Inventory.findById(req.params.id);
  if (!inv) return next(new AppError("No Document Found with that Id", 404));

  if (String(inv.pharmacy) !== String(pharmacy._id)) {
    return next(new AppError("Unauthorized", 401));
  }

  const { pharmacy: _ignored, ...rest } = req.body || {};
  Object.assign(inv, rest);
  await inv.save({ validateBeforeSave: true });

  res.status(200).json({ status: "success", data: { data: inv } });
});

/**
 * Staff/admin wrapper for inventory deletion.
 * Staff can only delete inventory in their own pharmacy.
 */
exports.deleteInventoryForStaffOrAdmin = catchAsync(async (req, res, next) => {
  if (req.user.role !== "staff") return factory.deleteOne(Inventory)(req, res, next);

  const pharmacy = await getStaffPharmacy(req.user.id);
  const inv = await Inventory.findById(req.params.id);
  if (!inv) return next(new AppError("No Document Found with that Id", 404));

  if (String(inv.pharmacy) !== String(pharmacy._id)) {
    return next(new AppError("Unauthorized", 401));
  }

  await inv.deleteOne();
  res.status(204).json({ status: "success", data: null });
});

exports.deleteInventory = factory.deleteOne(Inventory);
exports.createInventory = factory.createOne(Inventory);
exports.updateInventory = factory.updateOne(Inventory);

// Custom getAll that populates pharmacy.name and medicine.name so the admin
// table shows human-readable names instead of raw ObjectIds.
exports.getAllInventories = catchAsync(async (req, res, next) => {
  const baseQuery = Inventory.find()
    .populate({ path: "pharmacy", select: "name" })
    .populate({ path: "medicine", select: "name" });

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
exports.getInventory = factory.getOne(Inventory, {
  path: "pharmacy medicine",
  select: "name",
});
