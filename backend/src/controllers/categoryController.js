/**
 * Category controller
 * Handles all category-related operations
 */

import Category from "../models/Category.js";
import Album from "../models/Album.js";
import { MESSAGES } from "../config/constants.js";
import { formatResponse } from "../utils/helpers.js";

/**
 * Get all categories
 * @route GET /api/v1/categories
 */
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort("name")
      .populate("albumCount");

    res.json(formatResponse(true, "Categories retrieved", categories));
  } catch (error) {
    next(error);
  }
};

/**
 * Get albums by category
 * @route GET /api/v1/categories/:id/albums
 */
export const getAlbumsByCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json(formatResponse(false, "Category not found"));
    }

    const albums = await Album.find({ category: req.params.id })
      .populate("category", "name")
      .sort("-createdAt");

    res.json(
      formatResponse(true, "Albums retrieved", {
        category: category.name,
        count: albums.length,
        albums,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Create category (Admin only)
 * @route POST /api/v1/categories
 */
export const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);

    res
      .status(201)
      .json(formatResponse(true, MESSAGES.SUCCESS.CREATED, category));
  } catch (error) {
    next(error);
  }
};

/**
 * Update category (Admin only)
 * @route PUT /api/v1/categories/:id
 */
export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res
        .status(404)
        .json(formatResponse(false, MESSAGES.ERROR.NOT_FOUND));
    }

    res.json(formatResponse(true, MESSAGES.SUCCESS.UPDATED, category));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category (Admin only)
 * @route DELETE /api/v1/categories/:id
 */
export const deleteCategory = async (req, res, next) => {
  try {
    // Check if category has albums
    const albumCount = await Album.countDocuments({ category: req.params.id });

    if (albumCount > 0) {
      return res
        .status(400)
        .json(formatResponse(false, "Cannot delete category with albums"));
    }

    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res
        .status(404)
        .json(formatResponse(false, MESSAGES.ERROR.NOT_FOUND));
    }

    res.json(formatResponse(true, MESSAGES.SUCCESS.DELETED));
  } catch (error) {
    next(error);
  }
};
