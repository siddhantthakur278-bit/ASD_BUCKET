const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const filePath = path.join(__dirname, 'DB.JSON');
async function readData(){
  let data=await fs.readFile(filePath,'utf-8')
  return JSON.parse(data)
}
app.get('/products', async(req, res) => {
  try{

    let product=await readData()
    res.send(product)
  }catch(err){
    console.log(err)
  }
});
app.get('/products/:id', async (req, res) => {
  try {
    const products = await readData();
    const productId = Number(req.params.id); 
    const product = products.find(p => p.id === productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read database file' });
  }
});
app.listen(PORT, () => {
  console.log(`Express server running at http://localhost:${PORT}/products`);
});
