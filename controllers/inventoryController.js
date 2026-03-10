const Inventory = require("../models/inventoryModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");

exports.deleteInventory = factory.deleteOne(Inventory);
exports.createInventory = factory.createOne(Inventory);
exports.getAllInventories = factory.getAll(Inventory);
exports.updateInventory = factory.updateOne(Inventory);
exports.getInventory = factory.getOne(Inventory, {
  path: "pharmacy medicine",
  select: "name",
});
