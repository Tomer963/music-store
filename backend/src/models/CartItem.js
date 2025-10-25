import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Unique index for authenticated users (sparse: true means only applies when user exists)
cartItemSchema.index(
  { user: 1, album: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { user: { $type: "objectId" } },
  }
);

// Unique index for guest users
cartItemSchema.index(
  { sessionId: 1, album: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { sessionId: { $type: "string" } },
  }
);

// Regular indexes for fast lookup
cartItemSchema.index({ user: 1 });
cartItemSchema.index({ sessionId: 1 });

/**
 * Virtual: totalPrice
 * 
 * Calculates total price for this cart item
 *
 * @return {number}
 */
cartItemSchema.virtual("totalPrice").get(function () {
  return this.album?.price ? this.album.price * this.quantity : 0;
});

/**
 * updateQuantity
 * 
 * Updates the quantity of the cart item
 *
 * @param {number} newQuantity - New quantity value
 * @return {Promise<CartItem>}
 */
cartItemSchema.methods.updateQuantity = async function (newQuantity) {
  this.quantity = newQuantity;
  return await this.save();
};

const CartItem = mongoose.model("CartItem", cartItemSchema);

export default CartItem;