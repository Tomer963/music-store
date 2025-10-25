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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Virtual: albumCount
 *
 * Count number of albums in this category
 */
categorySchema.virtual("albumCount", {
  ref: "Album",
  localField: "_id",
  foreignField: "category",
  count: true,
});

const Category = mongoose.model("Category", categorySchema);

export default Category;
