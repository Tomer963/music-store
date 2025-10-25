import Album from "../models/Album.js";
import { MESSAGES, PAGINATION } from "../config/constants.js";
import { paginate, formatResponse } from "../utils/helpers.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";

/**
 * getAlbums
 *
 * Retrieve paginated list of albums with optional category filter
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const getAlbums = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    sort = "-createdAt",
    category = null,
  } = req.query;

  // Build query filter
  const queryFilter = category ? { category } : {};

  // Create query with population and sorting
  const query = Album.find(queryFilter).populate("category", "name").sort(sort);

  // Execute paginated query
  const result = await paginate(query, page, limit);

  res.json(formatResponse(true, "Albums retrieved successfully", result));
});

/**
 * getAlbum
 *
 * Retrieve single album by ID with populated category
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const getAlbum = asyncHandler(async (req, res) => {
  const album = await Album.findById(req.params.id).populate(
    "category",
    "name"
  );

  if (!album) {
    throw new AppError(MESSAGES.ERROR.NOT_FOUND, 404);
  }

  res.json(formatResponse(true, "Album retrieved successfully", album));
});

/**
 * searchAlbums
 *
 * Search albums by title, artist, or description using regex
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const searchAlbums = asyncHandler(async (req, res) => {
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
    .limit(10); // Limit search results for performance

  res.json(formatResponse(true, "Search results", albums));
});

/**
 * getNewAlbums
 *
 * Retrieve newest albums sorted by creation date
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const getNewAlbums = asyncHandler(async (req, res) => {
  const { page = 1, limit = 23 } = req.query;

  const query = Album.find().populate("category", "name").sort("-createdAt");
  const result = await paginate(query, page, limit);

  res.json(formatResponse(true, "New albums retrieved", result));
});

/**
 * createAlbum
 *
 * Create new album (Admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const createAlbum = asyncHandler(async (req, res) => {
  const album = await Album.create(req.body);

  // Populate category before returning
  await album.populate("category", "name");

  res.status(201).json(formatResponse(true, MESSAGES.SUCCESS.CREATED, album));
});

/**
 * updateAlbum
 *
 * Update existing album (Admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const updateAlbum = asyncHandler(async (req, res) => {
  const album = await Album.findByIdAndUpdate(req.params.id, req.body, {
    new: true, // Return updated document
    runValidators: true, // Run schema validators
  }).populate("category", "name");

  if (!album) {
    throw new AppError(MESSAGES.ERROR.NOT_FOUND, 404);
  }

  res.json(formatResponse(true, MESSAGES.SUCCESS.UPDATED, album));
});

/**
 * deleteAlbum
 *
 * Delete album by ID (Admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const deleteAlbum = asyncHandler(async (req, res) => {
  const album = await Album.findByIdAndDelete(req.params.id);

  if (!album) {
    throw new AppError(MESSAGES.ERROR.NOT_FOUND, 404);
  }

  res.json(formatResponse(true, MESSAGES.SUCCESS.DELETED));
});
