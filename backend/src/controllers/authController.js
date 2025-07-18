/**
 * Authentication controller
 * Handles user registration, login, and authentication
 */

import User from "../models/User.js";
import { MESSAGES } from "../config/constants.js";
import { formatResponse } from "../utils/helpers.js";

/**
 * Register new user
 * @route POST /api/v1/auth/register
 */
export const register = async (req, res, next) => {
  try {
    console.log("Register endpoint hit");
    console.log("Request body:", req.body);
    console.log("Headers:", req.headers);
    
    const { firstName, lastName, email, password } = req.body;
    
    console.log("Extracted data:", { firstName, lastName, email, password: password ? "***" : "missing" });

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      console.log("Missing required fields");
      return res.status(400).json(
        formatResponse(false, "All fields are required", null, [
          { field: !firstName ? "firstName" : !lastName ? "lastName" : !email ? "email" : "password", 
            message: "This field is required" }
        ])
      );
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("User already exists:", email);
      return res
        .status(400)
        .json(formatResponse(false, MESSAGES.ERROR.EMAIL_EXISTS));
    }

    // Create user
    console.log("Creating new user...");
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
    });

    // Generate token
    const token = user.generateAuthToken();
    
    console.log("User created successfully:", user._id);

    res.status(201).json(
      formatResponse(true, MESSAGES.SUCCESS.REGISTER, {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
        token,
      })
    );
  } catch (error) {
    console.error("Register error:", error);
    next(error);
  }
};

/**
 * Login user
 * @route POST /api/v1/auth/login
 */
export const login = async (req, res, next) => {
  try {
    console.log("Login endpoint hit");
    console.log("Request body:", req.body);
    
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(401)
        .json(formatResponse(false, MESSAGES.ERROR.INVALID_CREDENTIALS));
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = user.generateAuthToken();

    res.json(
      formatResponse(true, MESSAGES.SUCCESS.LOGIN, {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
        token,
      })
    );
  } catch (error) {
    console.error("Login error:", error);
    next(error);
  }
};

/**
 * Get user profile
 * @route GET /api/v1/auth/profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("wishlist");

    res.json(formatResponse(true, "Profile retrieved", user));
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * @route GET /api/v1/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    // In a real application, you might want to blacklist the token
    // or remove it from a token store

    res.json(formatResponse(true, MESSAGES.SUCCESS.LOGOUT));
  } catch (error) {
    next(error);
  }
};