const express = require("express")
const { handleCreateProduct, handleGetAllProducts, handleGetProductById, handleDeleteProduct, handleUpdateProduct } = require("../controllers/product")
const { upload } = require("../middlewares/upload")
const router = express.Router()

router.post("/", upload.fields([{ name: "images", maxCount: 5 }, { name: "coverImage", maxCount: 1 }]), handleCreateProduct)
router.get("/", handleGetAllProducts)
router.get("/:id", handleGetProductById)
router.patch("/:id", handleUpdateProduct)
router.delete("/:id", handleDeleteProduct)

module.exports = router