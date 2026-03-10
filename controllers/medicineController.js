const Medicine = require("../models/medicineModel");
const factory = require("./handlerFactory");


exports.createMedicine = factory.createOne(Medicine);
exports.getAllMedicines = factory.getAll(Medicine);
exports.updateMedicine = factory.updateOne(Medicine);
exports.deleteMedicine = factory.deleteOne(Medicine);
exports.getMedicine = factory.getOne(Medicine);
