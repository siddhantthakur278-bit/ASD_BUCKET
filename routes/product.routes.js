const express = require("express");
const router = express.Router();

// Fixed import paths: move up one level from 'routes' to reach 'controllers' and 'middleware'
const productController = require("../controllers/product.controller");
const { cacheMiddleware } = require("../middleware/cache.middleware");

router.get("/", cacheMiddleware, (req, res) =>
  productController.getAllProducts(req, res),
);
router.get("/:id", cacheMiddleware, (req, res) =>
  productController.getProductById(req, res),
);

router.post("/", (req, res) => productController.createProduct(req, res));
router.put("/:id", (req, res) => productController.updateProduct(req, res));
router.patch("/:id", (req, res) => productController.updateProduct(req, res));
router.delete("/:id", (req, res) => productController.deleteProduct(req, res));

module.exports = router;