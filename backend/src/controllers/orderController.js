import Order from "../models/Order.js";
import CartItem from "../models/CartItem.js";
import { MESSAGES, ORDER_STATUS } from "../config/constants.js";
import { formatResponse, sanitizeCardNumber } from "../utils/helpers.js";

/**
 * getOrders
 * Retrieves all orders for the authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("items.album")
      .sort("-createdAt");

    res.json(formatResponse(true, "Orders retrieved", orders));
  } catch (error) {
    next(error);
  }
};

/**
 * getAllOrders
 * Retrieves all orders in the system (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = status ? { status } : {};
    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate("items.album")
      .populate("user", "firstName lastName email")
      .sort("-createdAt")
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json(
      formatResponse(true, "All orders retrieved", {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * getOrder
 * Retrieves a single order by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.album")
      .populate("user", "firstName lastName email");

    if (!order) {
      return res.status(404).json(formatResponse(false, "Order not found"));
    }

    // Check if user owns the order or is admin
    if (!order.user.equals(req.user._id) && req.user.role !== "admin") {
      return res
        .status(403)
        .json(formatResponse(false, MESSAGES.ERROR.UNAUTHORIZED));
    }

    res.json(formatResponse(true, "Order retrieved", order));
  } catch (error) {
    next(error);
  }
};

/**
 * createOrder
 * Creates a new order from cart items
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const createOrder = async (req, res, next) => {
  try {
    console.log('🔵 === Order Creation Started ===');
    console.log('🔵 Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔵 User ID:', req.user?._id);
    
    const { paymentMethod, paymentInfo, billingInfo, totalAmount } = req.body;

    // Validation checks with detailed logging
    if (!totalAmount) {
      console.log('❌ Total amount missing');
      return res
        .status(400)
        .json(formatResponse(false, "Total amount is required"));
    }

    if (!paymentMethod) {
      console.log('❌ Payment method missing');
      return res
        .status(400)
        .json(formatResponse(false, "Payment method is required"));
    }

    if (!billingInfo) {
      console.log('❌ Billing info missing');
      return res
        .status(400)
        .json(formatResponse(false, "Billing information is required"));
    }

    // Check required billing fields
    if (!billingInfo.address || !billingInfo.city || !billingInfo.zipCode || !billingInfo.phone) {
      console.log('❌ Billing info incomplete:', billingInfo);
      return res
        .status(400)
        .json(formatResponse(false, "Complete billing information is required"));
    }

    console.log('✅ Validations passed');

    // Get user's cart items
    const cartItems = await CartItem.find({ user: req.user._id }).populate("album");
    console.log('🛒 Cart items found:', cartItems.length);

    if (cartItems.length === 0) {
      console.log('❌ Cart is empty');
      return res.status(400).json(formatResponse(false, "Cart is empty"));
    }

    // Validate stock and prepare order items
    const orderItems = [];
    let calculatedTotal = 0;

    for (const cartItem of cartItems) {
      console.log(`📀 Processing: ${cartItem.album.title} x${cartItem.quantity}`);
      
      if (!cartItem.album.canPurchase(cartItem.quantity)) {
        console.log(`❌ Out of stock: ${cartItem.album.title}`);
        return res
          .status(400)
          .json(
            formatResponse(false, `${cartItem.album.title} is out of stock`)
          );
      }

      orderItems.push({
        album: cartItem.album._id,
        quantity: cartItem.quantity,
        price: cartItem.album.price,
      });

      calculatedTotal += cartItem.album.price * cartItem.quantity;
    }

    console.log('💰 Calculated total:', calculatedTotal);
    console.log('💰 Sent total:', totalAmount);

    // ✅ לא שומרים פרטי כרטיס אשראי
    const paymentData = {};

    console.log('📝 Creating order...');
    
    // Create the order
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      totalAmount: calculatedTotal,
      paymentMethod,
      paymentInfo: paymentData,
      billingInfo,
    });

    console.log('✅ Order created:', order.orderNumber);

    // Update stock for each album
    await Promise.all(
      cartItems.map((item) => item.album.updateStock(item.quantity))
    );

    console.log('✅ Stock updated');

    // Clear user's cart
    await CartItem.deleteMany({ user: req.user._id });
    console.log('✅ Cart cleared');
    
    await order.populate("items.album");

    console.log('🔵 === Order Creation Completed ===');
    
    res
      .status(201)
      .json(formatResponse(true, "Order created successfully", order));
  } catch (error) {
    console.error('❌ === Order Creation Error ===');
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    next(error);
  }
};

/**
 * updateOrderStatus
 * Updates the status of an order (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    // Validate status
    if (!Object.values(ORDER_STATUS).includes(status)) {
      return res
        .status(400)
        .json(
          formatResponse(
            false,
            `Invalid status. Must be one of: ${Object.values(ORDER_STATUS).join(
              ", "
            )}`
          )
        );
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json(formatResponse(false, "Order not found"));
    }

    // Business logic for status transitions
    const currentStatus = order.status;

    // Cannot change status of cancelled orders
    if (currentStatus === ORDER_STATUS.CANCELLED) {
      return res
        .status(400)
        .json(formatResponse(false, "Cannot update status of cancelled order"));
    }

    // Cannot change status of delivered orders (except to cancelled)
    if (
      currentStatus === ORDER_STATUS.DELIVERED &&
      status !== ORDER_STATUS.CANCELLED
    ) {
      return res
        .status(400)
        .json(formatResponse(false, "Cannot update status of delivered order"));
    }

    // Update the status
    order.status = status;

    // If cancelling order, restore stock
    if (status === ORDER_STATUS.CANCELLED) {
      await order.populate("items.album");

      for (const item of order.items) {
        if (item.album) {
          item.album.stock += item.quantity;
          if (!item.album.availability && item.album.stock > 0) {
            item.album.availability = true;
          }
          await item.album.save();
        }
      }
    }

    await order.save();
    await order.populate("items.album");
    await order.populate("user", "firstName lastName email");

    res.json(formatResponse(true, `Order status updated to ${status}`, order));
  } catch (error) {
    next(error);
  }
};

/**
 * updateOrder
 * Updates order details (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json(formatResponse(false, "Order not found"));
    }

    // Prevent updating certain protected fields
    const restrictedFields = ["user", "orderNumber", "createdAt"];
    restrictedFields.forEach((field) => delete updates[field]);

    // Prevent updating if order is delivered or cancelled
    if (
      order.status === ORDER_STATUS.DELIVERED ||
      order.status === ORDER_STATUS.CANCELLED
    ) {
      return res
        .status(400)
        .json(formatResponse(false, `Cannot update ${order.status} order`));
    }

    // If updating items, recalculate total
    if (updates.items) {
      let newTotal = 0;
      for (const item of updates.items) {
        newTotal += item.price * item.quantity;
      }
      updates.totalAmount = newTotal;
    }

    // Update the order
    Object.keys(updates).forEach((key) => {
      order[key] = updates[key];
    });

    await order.save();
    await order.populate("items.album");
    await order.populate("user", "firstName lastName email");

    res.json(formatResponse(true, "Order updated successfully", order));
  } catch (error) {
    next(error);
  }
};

/**
 * cancelOrder
 * Cancels an order (User can cancel their own pending orders, Admin can cancel any)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate("items.album");

    if (!order) {
      return res.status(404).json(formatResponse(false, "Order not found"));
    }

    // Check permissions
    const isOwner = order.user.equals(req.user._id);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json(formatResponse(false, MESSAGES.ERROR.UNAUTHORIZED));
    }

    // Users can only cancel pending orders
    if (!isAdmin && order.status !== ORDER_STATUS.PENDING) {
      return res
        .status(400)
        .json(formatResponse(false, "You can only cancel pending orders"));
    }

    // Cannot cancel already cancelled or delivered orders
    if (order.status === ORDER_STATUS.CANCELLED) {
      return res
        .status(400)
        .json(formatResponse(false, "Order is already cancelled"));
    }

    if (order.status === ORDER_STATUS.DELIVERED) {
      return res
        .status(400)
        .json(formatResponse(false, "Cannot cancel delivered order"));
    }

    // Cancel the order and restore stock
    order.status = ORDER_STATUS.CANCELLED;

    // Restore stock for each item
    for (const item of order.items) {
      if (item.album) {
        item.album.stock += item.quantity;
        if (!item.album.availability && item.album.stock > 0) {
          item.album.availability = true;
        }
        await item.album.save();
      }
    }

    await order.save();
    await order.populate("user", "firstName lastName email");

    res.json(formatResponse(true, "Order cancelled successfully", order));
  } catch (error) {
    next(error);
  }
};

/**
 * deleteOrder
 * Permanently deletes an order (Admin only, only for cancelled orders)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json(formatResponse(false, "Order not found"));
    }

    // Only allow deletion of cancelled orders to maintain data integrity
    if (order.status !== ORDER_STATUS.CANCELLED) {
      return res
        .status(400)
        .json(
          formatResponse(
            false,
            "Only cancelled orders can be deleted. Cancel the order first."
          )
        );
    }

    await order.deleteOne();

    res.json(formatResponse(true, "Order deleted successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * getOrderStatistics
 * Get order statistics (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const getOrderStatistics = async (req, res, next) => {
  try {
    const statistics = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          totalRevenue: 1,
          _id: 0,
        },
      },
    ]);

    const totalOrders = await Order.countDocuments();
    const totalRevenue = statistics.reduce(
      (sum, stat) => sum + stat.totalRevenue,
      0
    );

    res.json(
      formatResponse(true, "Order statistics retrieved", {
        totalOrders,
        totalRevenue,
        byStatus: statistics,
      })
    );
  } catch (error) {
    next(error);
  }
};
