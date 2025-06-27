/**
 * User model
 * Defines the schema for user accounts
 */

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
      select: false,
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
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for email lookups
userSchema.index({ email: 1 });

// Password validation - at least one uppercase letter
userSchema.path("password").validate(function (value) {
  return /[A-Z]/.test(value);
}, "Password must contain at least one uppercase letter");

// Hash password before saving
userSchema.pre("save", async function (next) {
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

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate JWT token
userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE,
    }
  );
  return token;
};

// Method to add album to wishlist
userSchema.methods.addToWishlist = async function (albumId) {
  if (!this.wishlist.includes(albumId)) {
    this.wishlist.push(albumId);
    await this.save();
  }
  return this.wishlist;
};

// Method to remove album from wishlist
userSchema.methods.removeFromWishlist = async function (albumId) {
  this.wishlist = this.wishlist.filter((id) => !id.equals(albumId));
  await this.save();
  return this.wishlist;
};

const User = mongoose.model("User", userSchema);

export default User;
