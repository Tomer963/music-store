import Category from "../models/Category.js";
import Album from "../models/Album.js";
import { MESSAGES } from "../config/constants.js";
import { formatResponse } from "../utils/helpers.js";

/**
 * getCategories
 *
 * Retrieves all categories with album count
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find()
      .sort("name")
      .populate("albumCount");

    res.json(formatResponse(true, "Categories retrieved", categories));
  } catch (error) {
    next(error);
  }
};

/**
 * getCategory
 *
 * Retrieves a single category by ID
 *
 * @param {Object} req - Express request object with category ID in params
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json(formatResponse(false, "Category not found"));
    }

    res.json(formatResponse(true, "Category retrieved", category));
  } catch (error) {
    next(error);
  }
};

/**
 * getAlbumsByCategory
 *
 * Retrieves all albums in a specific category
 *
 * @param {Object} req - Express request object with category ID in params
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
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
      }),
    );
  } catch (error) {
    next(error);
  }
};

/**
 * createCategory
 *
 * Creates a new category (Admin only)
 *
 * @param {Object} req - Express request object with category data in body
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
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
 * updateCategory
 *
 * Updates an existing category (Admin only)
 *
 * @param {Object} req - Express request object with category ID in params and update data in body
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
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
 * deleteCategory
 *
 * Deletes a category if it has no albums (Admin only)
 *
 * @param {Object} req - Express request object with category ID in params
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const deleteCategory = async (req, res, next) => {
  try {
    // Prevent deletion of categories with albums
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