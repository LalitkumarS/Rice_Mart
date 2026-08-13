// src/utils/checkout.js
import { API_URL, RAZORPAY_KEY_ID } from '../config';
import { loadRazorpayScript } from './loadRazorpay';

/**
 * Runs the full checkout flow: ask the server to price + reserve stock and
 * open a Razorpay order, launch Razorpay Checkout, then ask the server to
 * verify the signature before treating the order as placed.
 *
 * @param {object} params
 * @param {import('firebase/auth').User} params.user - the logged-in Firebase user
 * @param {object} params.orderPayload - { productName, quantity } or { cartItems }, plus description/userDetails
 * @param {(order: object) => void} params.onSuccess
 * @param {(message: string) => void} params.onError
 * @param {() => void} [params.onCancelled] - called if the user closes the Razorpay modal without paying
 */
export async function startCheckout({ user, orderPayload, onSuccess, onError, onCancelled }) {
  if (!user) {
    onError('You must be logged in to place an order.');
    return;
  }

  let token;
  try {
    token = await user.getIdToken();
  } catch (err) {
    onError('Authentication error. Please log in again.');
    return;
  }

  // Step 1: server computes the real price, reserves stock, creates a Razorpay order.
  let createRes, createData;
  try {
    createRes = await fetch(`${API_URL}/api/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(orderPayload),
    });
    createData = await createRes.json().catch(() => ({}));
  } catch (err) {
    onError('Network error starting checkout. Please try again.');
    return;
  }

  if (!createRes.ok) {
    onError(createData.message || 'Could not start checkout.');
    return;
  }

  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    onError('Could not load the payment widget. Check your connection and try again.');
    return;
  }

  const { mongoOrderId, razorpayOrderId, amount, currency, keyId } = createData;

  const options = {
    key: keyId || RAZORPAY_KEY_ID,
    amount,
    currency,
    name: 'Rice Mart',
    description: 'Order payment',
    order_id: razorpayOrderId,
    prefill: {
      name: orderPayload.userDetails?.name,
      email: orderPayload.userDetails?.email,
      contact: orderPayload.userDetails?.phone,
    },
    handler: async (response) => {
      // Step 2: server verifies the signature — this is the ONLY step that
      // actually confirms payment. Everything before this is provisional.
      try {
        const verifyRes = await fetch(`${API_URL}/api/payment/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            mongoOrderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });
        const verifyData = await verifyRes.json().catch(() => ({}));
        if (verifyRes.ok) {
          onSuccess(verifyData.order);
        } else {
          onError(verifyData.message || 'Payment could not be verified.');
        }
      } catch (err) {
        onError('Network error verifying payment. If money was deducted, contact support with your order id.');
      }
    },
    modal: {
      ondismiss: () => {
        // User closed the widget without paying. The order stays
        // "Awaiting Payment" server-side (see paymentRoutes.js note about
        // releasing abandoned reservations on a timer).
        if (onCancelled) onCancelled();
      },
    },
    theme: { color: '#16a34a' },
  };

  const razorpay = new window.Razorpay(options);
  razorpay.on('payment.failed', (resp) => {
    onError(resp?.error?.description || 'Payment failed.');
  });
  razorpay.open();
}
