const Pharmacy = require("../models/pharmacyModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");

exports.getAllPharmacies = factory.getAll(Pharmacy);
exports.getPharmacy = factory.getOne(Pharmacy, {
  path: "staff",
  select: "-__v -location -role",
});
exports.createPharmacy = factory.createOne(Pharmacy);
exports.updatePharmacy = factory.updateOne(Pharmacy);
exports.deletePharmacy = factory.deleteOne(Pharmacy);
