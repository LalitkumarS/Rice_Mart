// src/utils/loadRazorpay.js
//
// Razorpay Checkout is loaded via a <script> tag rather than an npm package
// (that's how Razorpay's own docs recommend it — the widget is served
// directly from their CDN). This loads it once and reuses it on repeat calls.

let loadingPromise = null;

export function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return loadingPromise;
}
