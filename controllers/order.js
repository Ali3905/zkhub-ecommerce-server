const Order = require("../models/order");
const Product = require("../models/product"); // Your existing product model
const mongoose = require("mongoose");



// Create new order
const createOrder = async (req, res) => {

    try {
        const { items, shippingAddress, billingAddress, paymentMethod, shippingCost = 0, tax = 0, discount = 0 } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Order must contain at least one item"
            });
        }

        if (!shippingAddress || !billingAddress || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Shipping address, billing address, and payment method are required"
            });
        }

        // Validate and process order items
        const processedItems = [];
        let subtotal = 0;

        for (const item of items) {
            // Validate item structure
            if (!item.product || !item.quantity || item.quantity < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Each item must have a valid product ID and quantity"
                });
            }

            // Check if product exists and get current data
            const product = await Product.findById(item.product)
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Product with ID ${item.product} not found`
                });
            }

            // Check stock availability
            const { dialColor, strapColor } = item;
            if (!dialColor || !strapColor) {
                return res.status(400).json({
                    success: false,
                    message: `Both dialColor and strapColor are required for product "${product.title}"`
                });
            }

            const matchingVariantIndex = product.variants.findIndex(variant =>
                variant.dialColor === dialColor && variant.strapColor === strapColor
            );

            if (matchingVariantIndex === -1) {
                return res.status(400).json({
                    success: false,
                    message: `No matching variant found for dialColor "${dialColor}" and strapColor "${strapColor}" in product "${product.title}"`
                });
            }

            const matchingVariant = product.variants[matchingVariantIndex];

            if (matchingVariant.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for variant of product "${product.title}". Available: ${matchingVariant.stock}, Requested: ${item.quantity}`
                });
            }

            // Update the stock of the specific variant
            product.variants[matchingVariantIndex].stock -= item.quantity;
            product.sales += item.quantity;
            await product.save();


            // Validate size if provided
            if (item.size && !product.sizes.includes(item.size)) {
                return res.status(400).json({
                    success: false,
                    message: `Size "${item.size}" is not available for product "${product.title}"`
                });
            }

            const unitPrice = parseFloat(product.price.retail);
            const totalPrice = unitPrice * item.quantity;

            const processedItem = {
                product: product._id,
                productSnapshot: {
                    title: product.title,
                    price: product.price.retail,
                    coverImage: product.coverImage,
                    category: product.category,
                    subCategory: product.subCategory
                },
                quantity: item.quantity,
                size: item.size || null,
                dialColor,
                strapColor,
                unitPrice,
                totalPrice
            };


            processedItems.push(processedItem);
            subtotal += totalPrice;

            // Update product stock and sales
            // await Product.findByIdAndUpdate(
            //     product._id,
            //     {
            //         $inc: {
            //             stock: -item.quantity,
            //             sales: item.quantity
            //         }
            //     },
            // );
        }

        // Validate numeric fields
        const numericShippingCost = parseFloat(shippingCost) || 0;
        const numericTax = parseFloat(tax) || 0;
        const numericDiscount = parseFloat(discount) || 0;

        if (numericShippingCost < 0 || numericTax < 0 || numericDiscount < 0) {
            return res.status(400).json({
                success: false,
                message: "Shipping cost, tax, and discount must be non-negative values"
            });
        }

        // Create order
        const order = new Order({
            customerEmail: shippingAddress.email,
            items: processedItems,
            shippingAddress,
            billingAddress,
            subtotal,
            shippingCost: numericShippingCost,
            tax: numericTax,
            discount: numericDiscount,
            paymentMethod
        });

        await order.save();

        // Populate product details for response
        await order.populate('items.product', 'title price coverImage category');

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: {
                order: order,
                orderNumber: order.orderNumber
            }
        });

    } catch (error) {
        console.error("Create order error:", error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: errors
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to create order",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get orders by customer email with pagination and filtering
const getUserOrders = async (req, res) => {
    try {
        const { email } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        // Validate email
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Validate pagination parameters
        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: "Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100"
            });
        }

        // Build filter
        const filter = { customerEmail: email.toLowerCase() };
        if (status && ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].includes(status)) {
            filter.status = status;
        }

        // Build sort object
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder;

        const skip = (page - 1) * limit;

        const [orders, totalCount] = await Promise.all([
            Order.find(filter)
                .populate('items.product', 'title price coverImage category')
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error("Get user orders error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get specific order by ID
const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID format"
            });
        }

        const order = await Order.findById(orderId)
            .populate('items.product', 'title price coverImage category subCategory');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.json({
            success: true,
            data: { order }
        });

    } catch (error) {
        console.error("Get order by ID error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch order",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get order by order number
const getOrderByNumber = async (req, res) => {
    try {
        const { orderNumber } = req.params;

        if (!orderNumber || orderNumber.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Order number is required"
            });
        }

        const order = await Order.findOne({ orderNumber: orderNumber.trim() })
            .populate('items.product', 'title price coverImage category subCategory');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.json({
            success: true,
            data: { order }
        });

    } catch (error) {
        console.error("Get order by number error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch order",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Cancel order
const cancelOrder = async (req, res) => {

    try {
        const { orderId } = req.params;
        const { cancelReason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID format"
            });
        }

        const order = await Order.findById(orderId)

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Check if order can be cancelled
        if (['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Order cannot be cancelled. Current status: ${order.status}`
            });
        }

        // Restore product stock
        for (const item of order.items) {
            const product = await Product.findById(item.product);
            if (product) {
                const variantIndex = product.variants.findIndex(v =>
                    v.dialColor === item.dialColor && v.strapColor === item.strapColor
                );

                if (variantIndex !== -1) {
                    product.variants[variantIndex].stock += item.quantity;
                    product.sales -= item.quantity;
                    await product.save();
                }
            }

        }

        // Update order status
        order.status = 'CANCELLED';
        order.cancelledAt = new Date();
        order.cancelReason = cancelReason || 'Cancelled by customer';

        await order.save();

        res.json({
            success: true,
            message: "Order cancelled successfully",
            data: { order }
        });

    } catch (error) {
        console.error("Cancel order error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to cancel order",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Update order status (Admin only)
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, trackingNumber, estimatedDelivery } = req.body;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID format"
            });
        }

        const validStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status value"
            });
        }

        const updateData = { status };

        if (trackingNumber) updateData.trackingNumber = trackingNumber;
        if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery);
        if (status === 'DELIVERED') updateData.deliveredAt = new Date();

        const order = await Order.findByIdAndUpdate(
            orderId,
            updateData,
            { new: true, runValidators: true }
        ).populate('items.product', 'title price coverImage');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.json({
            success: true,
            message: "Order status updated successfully",
            data: { order }
        });

    } catch (error) {
        console.error("Update order status error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update order status",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get all orders (Admin only)
const getAllOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        // Build filter
        const filter = {};
        if (status && ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].includes(status)) {
            filter.status = status;
        }

        const skip = (page - 1) * limit;
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder;

        const [orders, totalCount] = await Promise.all([
            Order.find(filter)
                .populate('items.product', 'title price coverImage category')
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error("Get all orders error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Update order (Admin only)
const updateOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const updates = req.body;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID format"
            });
        }

        // Remove sensitive fields that shouldn't be updated directly
        delete updates._id;
        delete updates.orderNumber;
        delete updates.createdAt;
        delete updates.updatedAt;

        const order = await Order.findByIdAndUpdate(
            orderId,
            updates,
            { new: true, runValidators: true }
        ).populate('items.product', 'title price coverImage category');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.json({
            success: true,
            message: "Order updated successfully",
            data: { order }
        });

    } catch (error) {
        console.error("Update order error:", error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: errors
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to update order",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    createOrder,
    getUserOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    getOrderByNumber,
    getAllOrders,
    updateOrder
}