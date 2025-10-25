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

// Indexes
cartItemSchema.index(
  { user: 1, album: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { user: { $type: "objectId" } },
  }
);

cartItemSchema.index(
  { sessionId: 1, album: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { sessionId: { $type: "string" } },
  }
);

cartItemSchema.index({ user: 1 });
cartItemSchema.index({ sessionId: 1 });

// Virtual
cartItemSchema.virtual("totalPrice").get(function () {
  return this.album?.price ? this.album.price * this.quantity : 0;
});

// Methods
cartItemSchema.methods.updateQuantity = async function (newQuantity) {
  this.quantity = newQuantity;
  return await this.save();
};

const CartItem = mongoose.model("CartItem", cartItemSchema);

export default CartItem;