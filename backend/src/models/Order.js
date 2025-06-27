/**
 * Order model
 * Defines the schema for customer orders
 */

import mongoose from "mongoose";
import { ORDER_STATUS, PAYMENT_METHODS } from "../config/constants.js";

const orderItemSchema = new mongoose.Schema({
  album: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Album",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      required: true,
    },
    paymentInfo: {
      cardType: String,
      lastFourDigits: String,
      checkNumber: String,
    },
    billingInfo: {
      address: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
    },
    orderNumber: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for user orders
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });

// Generate order number before saving
orderSchema.pre("save", async function (next) {
  if (this.isNew) {
    this.orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;
  }
  next();
});

// Method to calculate total
orderSchema.methods.calculateTotal = function () {
  this.totalAmount = this.items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);
  return this.totalAmount;
};

const Order = mongoose.model("Order", orderSchema);

export default Order;
