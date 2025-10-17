import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { USER_ROLES } from "../config/constants.js";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [12, "First name cannot exceed 12 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [12, "Last name cannot exceed 12 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Album",
      },
    ],
    billingInfo: {
      address: String,
      city: String,
      zipCode: String,
      phone: String,
    },
    lastLogin: Date,
  },
  { timestamps: true }
);

// Index for faster email lookups
userSchema.index({ email: 1 });

// Pre-save hook to hash password
userSchema.pre("save", async function (next) {
  // Only hash if password is modified
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * comparePassword
 * Compares provided password with hashed password
 * @param {string} candidatePassword - Password to compare
 * @return {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * generateAuthToken
 * Generates JWT token for authentication
 * @return {string}
 */
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    }
  );
};

/**
 * addToWishlist
 * Adds album to user's wishlist
 * @param {string} albumId - Album ID to add
 * @return {Promise<Array>}
 */
userSchema.methods.addToWishlist = async function (albumId) {
  // Only add if not already in wishlist
  if (!this.wishlist.includes(albumId)) {
    this.wishlist.push(albumId);
    await this.save();
  }
  return this.wishlist;
};

/**
 * removeFromWishlist
 * Removes album from user's wishlist
 * @param {string} albumId - Album ID to remove
 * @return {Promise<Array>}
 */
userSchema.methods.removeFromWishlist = async function (albumId) {
  this.wishlist = this.wishlist.filter((id) => !id.equals(albumId));
  await this.save();
  return this.wishlist;
};

const User = mongoose.model("User", userSchema);

export default User;
