const mongoose = require("mongoose");
const Pharmacy = require("./pharmacyModel");
const Medicine = require("./medicineModel");
const validator = require("validator");

const orderSchema = new mongoose.Schema(
  {
    pharmacy: {
      type: mongoose.Schema.ObjectId,
      ref: "Pharmacy",
      required: [true, "An order must belong to a Pharmacy"],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "An order must belong to a User"],
    },
    items:[
      {
        medicine: {
          type: mongoose.Schema.ObjectId,
          ref: "Medicine",
          required: [true, "An order must have a medicine"],
        },
        quantity: {
          type: Number,
          required: [true, "User must specify quantity for medicine being ordered"],
          min: 1,
        },
        price: {
          type: Number,
          required: [true, "User must speficify initial price of 1 Quantity medicine"],
        },
        subtotal:{
          type: Number,
          required: [true, "User must specify the total amount for items ordered"]
        }
      }
    ],

    totalAmount: {
      type: Number,
      required: [true, "An order must have Total Amount"],
    },
    paymentStatus: {
      type: String,
      default: "unpaid",
      enum: ["paid", "unpaid"]
    },
    orderStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "confirmed","delivered","cancelled"]
    },
    deliveryAddress:{
      type: String,
      required: [true, "An order must have delivery address"]
    },
    // Prevents double-deduction if payment confirmation/webhook retries occur.
    stockDeducted: {
      type: Boolean,
      default: false,
    },
    createdAt: { type: Date, default: Date.now() },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
