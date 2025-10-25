import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      maxlength: [50, "Category name cannot exceed 50 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Virtual: albumCount
 *
 * Counts albums in this category
 */
categorySchema.virtual("albumCount", {
  ref: "Album",
  localField: "_id",
  foreignField: "category",
  count: true,
});

// Include virtuals in JSON output
categorySchema.set("toJSON", { virtuals: true });

const Category = mongoose.model("Category", categorySchema);

export default Category;
