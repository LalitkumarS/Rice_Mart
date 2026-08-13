// backend/seedStock.js
//
// One-time script to populate the Stock collection so orders have something
// to check availability against. Run with: node seedStock.js
//
// Safe to re-run: it upserts by name rather than duplicating rows.
require('dotenv').config();
const mongoose = require('mongoose');
const Stock = require('./models/Stock');
const { PRODUCT_PRICES } = require('./data/products');

const STARTING_QUANTITY = 100; // adjust as you like

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set — check backend/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for seeding.');

  const names = Object.keys(PRODUCT_PRICES);
  for (const name of names) {
    await Stock.updateOne(
      { name },
      { $setOnInsert: { name, bought: STARTING_QUANTITY, available: STARTING_QUANTITY } },
      { upsert: true }
    );
    console.log(`Ensured stock row for "${name}".`);
  }

  console.log('Done seeding stock.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
