// backend/utils/orderPricing.js
//
// Shared logic used by the payment flow: turn a client's requested items
// into a server-priced, validated line-item list, and reserve/release stock
// atomically. Centralized here so the same rules apply everywhere an order
// can be created — no route should ever compute a price or touch Stock
// directly.

const { getPrice } = require('../data/products');

class ValidationError extends Error {}

/**
 * @param {{ productName?: string, quantity?: number, cartItems?: Array }} body
 * @returns {{ lineItems: Array<{name:string, quantity:number, price:number}>, totalPrice: number }}
 */
function buildLineItems({ productName, quantity, cartItems }) {
  let lineItems;

  if (cartItems && cartItems.length > 0) {
    lineItems = cartItems.map((item) => ({ name: item.name, quantity: Number(item.quantity || 0) }));
  } else {
    lineItems = [{ name: productName, quantity: Number(quantity || 0) }];
  }

  for (const item of lineItems) {
    if (!item.name || !Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new ValidationError(`Invalid item or quantity for "${item.name}".`);
    }
    const price = getPrice(item.name);
    if (price === undefined) {
      throw new ValidationError(`Unknown product: "${item.name}".`);
    }
    item.price = price;
  }

  const totalPrice = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { lineItems, totalPrice };
}

/**
 * Atomically reserves stock for every line item, or throws and rolls back
 * anything already reserved for this call if any item is short.
 */
async function reserveStock(Stock, lineItems) {
  const reserved = [];
  try {
    for (const item of lineItems) {
      const result = await Stock.updateOne(
        { name: item.name, available: { $gte: item.quantity } },
        { $inc: { available: -item.quantity } }
      );
      if (result.matchedCount === 0) {
        throw new Error(`Insufficient stock for "${item.name}".`);
      }
      reserved.push(item);
    }
  } catch (err) {
    for (const item of reserved) {
      await Stock.updateOne({ name: item.name }, { $inc: { available: item.quantity } });
    }
    throw err;
  }
}

/** Releases previously reserved stock (e.g. on payment failure/cancellation). */
async function releaseStock(Stock, lineItems) {
  for (const item of lineItems || []) {
    if (!item || !item.name) continue;
    await Stock.updateOne({ name: item.name }, { $inc: { available: Number(item.quantity || 0) } });
  }
}

module.exports = { ValidationError, buildLineItems, reserveStock, releaseStock };
