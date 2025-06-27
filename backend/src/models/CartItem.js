/**
 * CartItem model
 * Defines the schema for shopping cart items
 */

import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    album: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Album",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
    sessionId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user and album to prevent duplicates
cartItemSchema.index({ user: 1, album: 1 }, { unique: true });
cartItemSchema.index({ sessionId: 1 });

// Virtual for total price
cartItemSchema.virtual("totalPrice").get(function () {
  if (this.album && this.album.price) {
    return this.album.price * this.quantity;
  }
  return 0;
});

// Method to update quantity
cartItemSchema.methods.updateQuantity = async function (newQuantity) {
  this.quantity = newQuantity;
  return await this.save();
};

const CartItem = mongoose.model("CartItem", cartItemSchema);

export default CartItem;
