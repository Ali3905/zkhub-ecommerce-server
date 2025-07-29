const mongoose = require("mongoose");

const productSchema = mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  subTitle: String,
  description: {
    type: String,
    required: true
  },
  brandName: {
    type: String,
    required: true
  },
  price: {
    retail: {
      type: Number,
      required: true
    },
    display: {
      type: Number,
      default: null
    }
  },
  variants: [{
    model: { type: String },
    color: { type: String, required: true },
    stock: { type: Number, required: true },
    images: [{ url: String }] // optional: show different image per variant
  }],
  images: [String],
  coverImage: String,
  category: String,
  subCategory: String,
  sales: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
