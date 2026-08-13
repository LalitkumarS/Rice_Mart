// backend/routes/stockRoutes.js
const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const authMiddleware = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

// Public: anyone can see current stock levels (needed for the storefront).
router.get('/', async (req, res) => {
  try {
    const stocks = await Stock.find({}).sort({ name: 1 });
    res.status(200).json(stocks);
  } catch (error) {
    console.error("GET /api/stocks - error:", error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch stocks.' });
  }
});

// Admin-only: manual bulk stock adjustment.
// (Normal order-driven stock decrements now happen atomically inside
// orderController.createOrder, not here — this route is for manual
// corrections/restocking by an admin.)
router.put('/update-batch', authMiddleware, requireAdmin, async (req, res) => {
  const itemsToUpdate = req.body;

  if (!Array.isArray(itemsToUpdate) || itemsToUpdate.length === 0) {
    return res.status(400).json({ message: 'Invalid update data provided.' });
  }

  try {
    const operations = itemsToUpdate.map(item => ({
      updateOne: {
        filter: { name: item.name },
        update: { $inc: { available: -item.quantitySold } }
      }
    }));

    const result = await Stock.bulkWrite(operations);

    if (result.modifiedCount > 0) {
      res.status(200).json({ message: `${result.modifiedCount} stock items updated successfully.` });
    } else if (result.matchedCount > 0 && result.modifiedCount === 0) {
      res.status(200).json({ message: "Stock items matched but no changes made." });
    } else {
      res.status(404).json({ message: 'No matching stock items found to update.' });
    }
  } catch (error) {
    console.error('PUT /api/stocks/update-batch - error:', error);
    res.status(500).json({ message: 'Failed to update stock levels.' });
  }
});

module.exports = router;
