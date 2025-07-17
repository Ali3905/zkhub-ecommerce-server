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
  strapType: {
    type: String,
    enum: ["CHAIN", "BELT"],
    required: true
  },
  variants: [{
    dialColor: { type: String, required: true },
    strapColor: { type: String, required: true },
    stock: { type: Number, required: true },
    images: [{ url: String }] // optional: show different image per variant
  }],
  images: [String],
  coverImage: String,
  category: String,
  subCategory: String,
  gender: {
    type: String,
    enum: ["MALE", "FEMALE", "KIDS", "UNISEX"],
  },
  sizes: {
    type: [{
      type: String,
      enum: ["XS", "S", "M", "L", "XL", "XXL"]
    }],
    default: []
  },
  sales: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
