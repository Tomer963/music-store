import Album from "../models/Album.js";
import { MESSAGES, PAGINATION } from "../config/constants.js";
import { paginate, formatResponse } from "../utils/helpers.js";

/**
 * getAlbums
 * Retrieves all albums with pagination and optional category filter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const getAlbums = async (req, res, next) => {
  try {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sort = "-createdAt",
      category = null,
    } = req.query;

    // Build query filter
    const queryFilter = category ? { category } : {};
    const query = Album.find(queryFilter)
      .populate("category", "name")
      .sort(sort);
    const result = await paginate(query, page, limit);

    res.json(formatResponse(true, "Albums retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};

/**
 * getAlbum
 * Retrieves a single album by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const getAlbum = async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id).populate(
      "category",
      "name"
    );

    if (!album) {
      return res
        .status(404)
        .json(formatResponse(false, MESSAGES.ERROR.NOT_FOUND));
    }

    res.json(formatResponse(true, "Album retrieved successfully", album));
  } catch (error) {
    next(error);
  }
};

/**
 * searchAlbums
 * Searches albums by title, artist or description
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const searchAlbums = async (req, res, next) => {
  try {
    const { q } = req.query;

    // Validate search query length
    if (!q || q.trim().length < 3) {
      return res.json(formatResponse(true, "Search results", []));
    }

    const searchQuery = q.trim();
    const searchRegex = new RegExp(searchQuery, "i");

    // Search across multiple fields
    const albums = await Album.find({
      $or: [
        { title: searchRegex },
        { artist: searchRegex },
        { description: searchRegex },
      ],
    })
      .populate("category", "name")
      .limit(10);

    res.json(formatResponse(true, "Search results", albums));
  } catch (error) {
    next(error);
  }
};

/**
 * getNewAlbums
 * Retrieves newest albums sorted by creation date
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const getNewAlbums = async (req, res, next) => {
  try {
    const { page = 1, limit = 23 } = req.query;

    const query = Album.find().populate("category", "name").sort("-createdAt");

    const result = await paginate(query, page, limit);
    res.json(formatResponse(true, "New albums retrieved", result));
  } catch (error) {
    next(error);
  }
};

/**
 * createAlbum
 * Creates a new album (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const createAlbum = async (req, res, next) => {
  try {
    const album = await Album.create(req.body);
    await album.populate("category", "name");

    res.status(201).json(formatResponse(true, MESSAGES.SUCCESS.CREATED, album));
  } catch (error) {
    next(error);
  }
};

/**
 * updateAlbum
 * Updates an existing album (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const updateAlbum = async (req, res, next) => {
  try {
    const album = await Album.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("category", "name");

    if (!album) {
      return res
        .status(404)
        .json(formatResponse(false, MESSAGES.ERROR.NOT_FOUND));
    }

    res.json(formatResponse(true, MESSAGES.SUCCESS.UPDATED, album));
  } catch (error) {
    next(error);
  }
};

/**
 * deleteAlbum
 * Deletes an album (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const deleteAlbum = async (req, res, next) => {
  try {
    const album = await Album.findByIdAndDelete(req.params.id);

    if (!album) {
      return res
        .status(404)
        .json(formatResponse(false, MESSAGES.ERROR.NOT_FOUND));
    }

    res.json(formatResponse(true, MESSAGES.SUCCESS.DELETED));
  } catch (error) {
    next(error);
  }
};
