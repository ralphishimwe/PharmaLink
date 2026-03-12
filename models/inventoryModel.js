const mongoose = require("mongoose");
const Pharmacy = require("./pharmacyModel");
const Medicine = require("./medicineModel");
const validator = require("validator");

const inventorySchema = new mongoose.Schema(
  {
    pharmacy: {
      type: mongoose.Schema.ObjectId,
      ref: "Pharmacy",
      required: [true, "A Pharmacy product must belong to a Pharmacy"],
    },
    medicine: {
      type: mongoose.Schema.ObjectId,
      ref: "Medicine",
      required: [true, "A Pharmacy product must have medicine"],
    },
    price: {
      type: Number,
      required: [true, "A Pharmacy product must have price"],
      min: 1,
    },
    quantity: {
      type: Number,
      required: [true, "A Pharmacy product must have quanity"],
      min: 1,
    },
    batchNo: {
      type: String,
      required: [true, "A Pharmacy product must have a batch number"],
    },
    // Optional expiry date for a specific batch of medicine in this pharmacy
    expiryDate: {
      type: Date,
    },
    createdAt: { type: Date, default: Date.now() },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Create a unique compound index on pharmacy and medicine to prevent duplicates
inventorySchema.index({ pharmacy: 1, medicine: 1 }, { unique: true });

const Inventory = mongoose.model("Inventory", inventorySchema);

module.exports = Inventory;
