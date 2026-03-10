const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A Medicine must have a name"],
      trim: true,
    },
    dosageForm: {
      type: String,
      required: [true, "A medicine must have a dosage form"],
      enum: ["tablet", "injection", "syrup"]
    },
    manufacturer: {
      type: String,
      required: [true, "A medicine must have a manufacturer"],
    },
    images: [String],
    createdAt: { type: Date, default: Date.now() },
    details: {
      type: String,
      required: [true, "Medicine must have details"],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Medicine = mongoose.model("Medicine", medicineSchema);

module.exports = Medicine;
