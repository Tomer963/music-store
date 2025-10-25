import mongoose from "mongoose";
import { ValidationError } from "../middleware/errorHandler.js";

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
    originalPrice: {
      type: Number,
      min: [0, "Original price cannot be negative"],
      default: null,
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
        url: { type: String, required: true },
        isMain: { type: Boolean, default: false },
      },
    ],
    availability: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
albumSchema.index({ title: 1 });
albumSchema.index({ artist: 1 });
albumSchema.index({ category: 1 });
albumSchema.index({ createdAt: -1 });

// Virtuals
albumSchema.virtual("inStock").get(function () {
  return this.stock > 0 && this.availability === true;
});

albumSchema.virtual("discountPercentage").get(function () {
  if (!this.originalPrice || this.originalPrice <= this.price) {
    return 0;
  }
  return Math.round(
    ((this.originalPrice - this.price) / this.originalPrice) * 100
  );
});

albumSchema.virtual("hasDiscount").get(function () {
  return this.originalPrice && this.originalPrice > this.price;
});

// Methods
albumSchema.methods.canPurchase = function (quantity) {
  return this.stock >= quantity && this.availability;
};

albumSchema.methods.updateStock = async function (quantity) {
  if (quantity > this.stock) {
    throw new ValidationError(["Insufficient stock available"]);
  }

  this.stock -= quantity;

  if (this.stock === 0) {
    this.availability = false;
  }

  return await this.save();
};

// Hooks
albumSchema.pre("save", function (next) {
  if (this.images?.length > 0) {
    const hasMainImage = this.images.some((img) => img.isMain);

    if (!hasMainImage) {
      this.images[0].isMain = true;
    }
  }

  if (this.images?.length > 3) {
    return next(new ValidationError(["Maximum 3 images allowed"]));
  }

  next();
});

const Album = mongoose.model("Album", albumSchema);

export default Album;