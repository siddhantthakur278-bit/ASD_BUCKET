const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = 3000;
const filePath = path.join(__dirname, 'db.json');
app.use(express.json());
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function readData() {
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}
async function writeData(data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
const database = {
  getAllProducts: async () => {
    await delay(1000); // Simulated DB delay from workshop code
    return await readData();
  },
  getProductById: async (id) => {
    const products = await readData();
    return products.find((p) => p.id === Number(id));
  },
  createProduct: async (productData) => {
    const products = await readData();
    const newProduct = { id: Date.now(), ...productData };
    products.push(newProduct);
    await writeData(products);
    return newProduct;
  },
  updateProduct: async (id, productData) => {
    const products = await readData();
    const index = products.findIndex((p) => p.id === Number(id));
    if (index === -1) return null;
    products[index] = { ...products[index], ...productData };
    await writeData(products);
    return products[index];
  },
  deleteProduct: async (id) => {
    const products = await readData();
    const index = products.findIndex((p) => p.id === Number(id));
    if (index === -1) return false;
    const updatedProducts = products.filter((p) => p.id !== Number(id));
    await writeData(updatedProducts);
    return true;
  }
};
const cache = {};
const TTL_MS = 60 * 1000; // 1 minute TTL
const cacheMiddleware = (req, res, next) => {
  const key = req.originalUrl || req.url;
  const cachedItem = cache[key];
  if (cachedItem) {
    const isExpired = Date.now() - cachedItem.createdAt > TTL_MS;
    if (!isExpired) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedItem.data);
    } else {
      delete cache[key];
    }
  }
  res.setHeader('X-Cache', 'MISS');
  const originalJson = res.json;
  res.json = function (body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cache[key] = {
        data: body,
        createdAt: Date.now(),
      };
    }
    return originalJson.call(this, body);
  };
  next();
};
const clearCache = () => {
  Object.keys(cache).forEach((key) => delete cache[key]);
};
const productService = {
  getAllProducts: async () => {
    return await database.getAllProducts();
  },
  getProductById: async (id) => {
    return await database.getProductById(id);
  },
  createProduct: async (data) => {
    return await database.createProduct(data);
  },
  updateProduct: async (id, data) => {
    return await database.updateProduct(id, data);
  },
  deleteProduct: async (id) => {
    return await database.deleteProduct(id);
  }
};
const productController = {
  getAllProducts: async (req, res) => {
    try {
      const products = await productService.getAllProducts();
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read database file' });
    }
  },
  getProductById: async (req, res) => {
    try {
      const product = await productService.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read database file' });
    }
  },
  createProduct: async (req, res) => {
    try {
      const newProduct = await productService.createProduct(req.body);
      clearCache(); // Invalidate stale cache
      res.status(201).json(newProduct);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create product' });
    }
  },
  updateProduct: async (req, res) => {
    try {
      const updatedProduct = await productService.updateProduct(req.params.id, req.body);
      if (!updatedProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }
      clearCache(); 
      res.json(updatedProduct);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update product' });
    }
  },
  deleteProduct: async (req, res) => {
    try {
      const success = await productService.deleteProduct(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Product not found' });
      }
      clearCache(); 
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }
};
const productRouter = express.Router();
productRouter.get('/', cacheMiddleware, productController.getAllProducts);
productRouter.get('/:id', cacheMiddleware, productController.getProductById);
productRouter.post('/', productController.createProduct);
productRouter.put('/:id', productController.updateProduct);
productRouter.patch('/:id', productController.updateProduct);
productRouter.delete('/:id', productController.deleteProduct);
app.use('/products', productRouter);
app.listen(PORT, () => {
  console.log(`Express server running at http://localhost:${PORT}/products`);
});