/**
 * Album model
 * Defines the schema for music albums
 */

import mongoose from "mongoose";

const albumSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Album title is required"],
      trim: true,
      maxlength: [100, "Album title cannot exceed 100 characters"],
    },
    artist: {
      type: String,
      required: [true, "Artist name is required"],
      trim: true,
      maxlength: [100, "Artist name cannot exceed 100 characters"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    releaseYear: {
      type: Number,
      required: [true, "Release year is required"],
      min: [1900, "Release year must be after 1900"],
      max: [new Date().getFullYear(), "Release year cannot be in the future"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    longDescription: {
      type: String,
      maxlength: [2000, "Long description cannot exceed 2000 characters"],
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        isMain: {
          type: Boolean,
          default: false,
        },
      },
    ],
    availability: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
albumSchema.index({ title: "text", artist: "text" });
albumSchema.index({ category: 1 });
albumSchema.index({ price: 1 });
albumSchema.index({ createdAt: -1 });

// Virtual for availability status
albumSchema.virtual("inStock").get(function () {
  return this.stock > 0;
});

// Method to check if album can be purchased
albumSchema.methods.canPurchase = function (quantity) {
  return this.stock >= quantity && this.availability;
};

// Method to update stock after purchase
albumSchema.methods.updateStock = async function (quantity) {
  this.stock -= quantity;
  if (this.stock === 0) {
    this.availability = false;
  }
  return await this.save();
};

// Pre-save middleware to ensure at least one main image
albumSchema.pre("save", function (next) {
  if (this.images && this.images.length > 0) {
    const hasMainImage = this.images.some((img) => img.isMain);
    if (!hasMainImage) {
      this.images[0].isMain = true;
    }
  }
  next();
});

const Album = mongoose.model("Album", albumSchema);

export default Album;
