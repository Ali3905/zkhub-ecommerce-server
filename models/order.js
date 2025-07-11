// ==================== ORDER MODEL ====================
// models/Order.js
const mongoose = require("mongoose");

const orderItemSchema = mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    productSnapshot: {
        title: { type: String, required: true },
        price: { type: String, required: true },
        coverImage: String,
        category: String,
        subCategory: String
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, "Quantity must be at least 1"]
    },
    dialColor: {
        type: String,
        required: true,
        trim: true
    },
    strapColor: {
        type: String,
        required: true,
        trim: true
    },
    size: {
        type: String,
        enum: ["XS", "S", "M", "L", "XL", "XXL"],
        trim: true
    },
    unitPrice: {
        type: Number,
        required: true,
        min: [0, "Unit price must be non-negative"]
    },
    totalPrice: {
        type: Number,
        required: true,
        min: [0, "Total price must be non-negative"]
    }
});

const addressSchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
    },
    mobileNumber: {
        type: String,
        required: true,
        trim: true,
        match: [/^[\+]?[0-9][\d]{0,15}$/, "Please enter a valid phone number"]
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        minlength: [2, "First name must be at least 2 characters"],
        maxlength: [50, "First name cannot exceed 50 characters"]
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        minlength: [2, "Last name must be at least 2 characters"],
        maxlength: [50, "Last name cannot exceed 50 characters"]
    },
    country: {
        type: String,
        required: true,
        trim: true,
        minlength: [2, "Country must be at least 2 characters"]
    },
    state: {
        type: String,
        required: true,
        trim: true,
        minlength: [2, "State must be at least 2 characters"]
    },
    address: {
        type: String,
        required: true,
        trim: true,
        minlength: [10, "Address must be at least 10 characters"],
        maxlength: [200, "Address cannot exceed 200 characters"]
    },
    postalCode: {
        type: String,
        required: true,
        trim: true,
        match: [/^[0-9A-Z\s-]{3,10}$/i, "Please enter a valid postal code"]
    },
    city: {
        type: String,
        required: true,
        trim: true,
        minlength: [2, "City must be at least 2 characters"]
    }
});

const orderSchema = mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        // required: true
    },
    customerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
    },
    items: {
        type: [orderItemSchema],
        required: true,
        validate: {
            validator: function (items) {
                return items && items.length > 0;
            },
            message: "Order must contain at least one item"
        }
    },
    shippingAddress: {
        type: addressSchema,
        required: true
    },
    billingAddress: {
        type: addressSchema,
        required: true
    },
    subtotal: {
        type: Number,
        required: true,
        min: [0, "Subtotal must be non-negative"]
    },
    shippingCost: {
        type: Number,
        default: 0,
        min: [0, "Shipping cost must be non-negative"]
    },
    tax: {
        type: Number,
        default: 0,
        min: [0, "Tax must be non-negative"]
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, "Discount must be non-negative"]
    },
    totalAmount: {
        type: Number,
        // required: true,
        min: [0, "Total amount must be non-negative"]
    },
    status: {
        type: String,
        enum: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"],
        default: "PENDING"
    },
    paymentStatus: {
        type: String,
        enum: ["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"],
        default: "PENDING"
    },
    paymentMethod: {
        type: String,
        enum: ["CREDIT_CARD", "DEBIT_CARD", "PAYPAL", "BANK_TRANSFER", "CASH_ON_DELIVERY"],
        required: true
    },
    paymentId: String,
    trackingNumber: String,
    estimatedDelivery: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    cancelReason: String,
    notes: String
}, { timestamps: true });


orderSchema.pre('save', async function (next) {
    if (!this.orderNumber) {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.orderNumber = `ORD-${timestamp.slice(-8)}-${random}`;
    }
    next();
});


orderSchema.pre('save', function (next) {
    if (this.isModified('items') || this.isModified('shippingCost') || this.isModified('tax') || this.isModified('discount')) {
        this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
        this.totalAmount = this.subtotal + this.shippingCost + this.tax - this.discount;
    }
    next();
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;

