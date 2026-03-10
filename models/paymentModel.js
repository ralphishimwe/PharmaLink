const mongoose = require("mongoose");
const Order = require("./orderModel");
const { isLowercase } = require("validator");

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.ObjectId,
      ref: "Order",
      required: [true, "Paymet must for an order"],
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
      required: [true, "Payment must have transactionID"],
    },
    status: {
      type: String,
      required: [true, "Payment must have current payment status"],
      enum: ["successful", "failed", "pending"],
    },
    paidAt: { type: Date, default: Date.now() },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
