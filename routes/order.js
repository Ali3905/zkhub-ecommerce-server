const express = require("express");
const router = express.Router();
const {
    createOrder,
    getUserOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    getOrderByNumber,
    getAllOrders,
    updateOrder
} = require("../controllers/order");

router.post("/", createOrder);

// Get orders by email
router.get("/email/:email", getUserOrders);

// Get specific order by ID
router.get("/:orderId", getOrderById);

// Get order by order number
router.get("/number/:orderNumber", getOrderByNumber);

// Cancel order
router.patch("/:orderId/cancel", cancelOrder);

// Admin routes
router.get("/admin/all", getAllOrders);
router.patch("/admin/:orderId/status", updateOrderStatus);
router.patch("/admin/:orderId", updateOrder);

module.exports = router;