// backend/data/products.js
//
// Canonical, server-side source of truth for product prices.
//
// The frontend (src/components/product.js) has its own copy of this list for
// display purposes, but the SERVER must never trust a price sent by the
// client when creating an order — otherwise anyone can open devtools and
// submit totalPrice: 1 for any item. Keep this list in sync with the
// frontend list's `name` and `price` fields.

const PRODUCT_PRICES = {
  "Basmati Rice": 100,
  "Jasmine Rice": 150,
  "Red Rice": 200,
  "Mogra Rice": 250,
  "Brown Rice": 300,
  "Black Rice": 350,
  "Sona Masuri Rice": 400,
  "Ambemohar Rice": 450,
  "Kala Jeera Rice": 500,
  "Bamboo Rice": 550,
  "Premium Idly Rice": 120,
  "Crispy Dosa Rice": 110,
  "Seeraga Samba Rice": 180,
};

function getPrice(productName) {
  return PRODUCT_PRICES[productName];
}

module.exports = { PRODUCT_PRICES, getPrice };
