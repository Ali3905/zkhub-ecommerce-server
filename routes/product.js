const express = require("express")
const { handleCreateProduct, handleGetAllProducts, handleGetProductById, handleDeleteProduct, handleUpdateProduct } = require("../controllers/product")
const router = express.Router()

router.post("/", handleCreateProduct)
router.get("/", handleGetAllProducts)
router.get("/:id", handleGetProductById)
router.patch("/:id", handleUpdateProduct)
router.delete("/:id", handleDeleteProduct)

module.exports = router