const mongoose = require("mongoose");
const Order = require("./orderModel");
const { isLowercase } = require("validator");

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.ObjectId,
      ref: "Order",
      required: [true, "Payment must for an order"],
    },
    amount: {
      type: Number,
      required: [true, "Payment must have Amount to paid"],
    },
    paymentMethod: {
      type: String,
      required: [true, "Payment must have method used to pay"],
      enum: ["mobile_money", "bank_transfer", "card"],
    },
    provider: {
      type: String,
      required: [true, "Payment must have provider used for paying"],
      enum: ["irembopay"],
    },
    transactionID: {
      type: String,
      // Set later by provider callback/webhook
      sparse: true,
    },
    status: {
      type: String,
      default: "pending",
      enum: ["successful", "failed", "pending"],
    },
    // Provider initiation metadata (optional; useful for client redirects / debugging)
    providerReference: {
      type: String,
    },
    paymentUrl: {
      type: String,
    },
    createdAt: { type: Date, default: Date.now() },
    paidAt: { type: Date },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
