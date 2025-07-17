const Product = require("../models/product");

async function handleCreateProduct(req, res) {
    try {

        if (req.files) {
            for (const key of Object.keys(req.files)) {
                if (req.files[key] && req.files[key].length > 1) {
                    req.body[key] = [];
                    for (const file of req.files[key]) {
                        if (file.location) {
                            req.body[key].push(file.location);
                        }
                    }
                } else if (req.files[key][0] && req.files[key][0].location) {
                    req.body[key] = req.files[key][0].location;
                }
            }
        }
        const {
            title,
            subTitle,
            description,
            brandName,
            strapType,
            price,
            variants,
            category,
            subCategory,
            gender,
            sizes,
            images,
            coverImage
        } = req.body;

        // Validate required fields
        if (!title || !description || !brandName || !strapType || !price?.retail || !price?.display || !variants || !variants.length) {
            return res.status(400).json({
                error: "Missing required fields: title, description, brandName, strapType, price.retail, price.display, or variants."
            });
        }

        const product = new Product({
            title,
            subTitle,
            description,
            brandName,
            strapType,
            price: {
                retail: price.retail,
                display: price.display || null
            },
            variants,
            category,
            subCategory,
            gender,
            sizes,
            images,
            coverImage
        });

        const savedProduct = await product.save();

        res.status(201).json({
            success: true,
            data: savedProduct
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Server error while creating product.",
            details: error.message
        });
    }
}

async function handleGetAllProducts(req, res) {
    try {
        const foundProducts = await Product.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: foundProducts,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || "Server error while fetching products." });
    }
}

async function handleGetProductById(req, res) {
    try {
        const foundProduct = await Product.findById(req.params.id);
        if (!foundProduct) return res.status(404).json({ error: "Product not found." });
        res.status(200).json({
            success: true,
            data: foundProduct,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Server error while fetching product." });
    }
}

async function handleUpdateProduct(req, res) {
    try {
        const updateFields = req.body;

        // Optional: You could add validation logic here for nested fields like price, variants, etc.
        if (!Object.keys(updateFields).length) {
            return res.status(400).json({ error: "At least one field must be provided to update." });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedProduct) return res.status(404).json({ success: false, error: "Product not found." });

        res.status(200).json({
            success: true,
            data: updatedProduct,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Server error while updating product." });
    }
}

async function handleDeleteProduct(req, res) {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) return res.status(404).json({ success: false, error: "Product not found." });
        res.status(200).json({ success: true, message: "Product deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, error: "Server error while deleting product." });
    }
}

module.exports = {
    handleCreateProduct,
    handleDeleteProduct,
    handleGetAllProducts,
    handleGetProductById,
    handleUpdateProduct,
    handleDeleteProduct
};
