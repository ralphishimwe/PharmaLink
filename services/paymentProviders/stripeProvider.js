const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Default frontend URL for redirecting after Stripe checkout.
// You can override it by setting FRONTEND_URL in config.env.
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/**
 * Stripe payment provider integration.
 * Creates Stripe Checkout Sessions for payment initiation.
 *
 * Flow:
 * 1. Backend creates Checkout Session with order details
 * 2. Returns checkout URL to frontend
 * 3. User redirected to Stripe hosted checkout page
 * 4. User completes payment on Stripe
 * 5. Stripe sends webhook to backend
 * 6. Backend processes webhook and updates order/payment
 */
exports.initiate = async ({
  orderId,
  amount,
  orderItems = [],
  currency = "usd",
} = {}) => {
  // Convert amount to cents for Stripe (assuming amount is in dollars)
  const amountInCents = Math.round(amount * 100);

  // Create line items from order items for detailed checkout display
  const lineItems = orderItems.map((item) => ({
    price_data: {
      currency: currency,
      product_data: {
        name: item.medicine?.name || item.medicine?.toString() || "Medicine",
        description: `Quantity: ${item.quantity}`,
      },
      unit_amount: Math.round(item.price * 100), // Price per unit in cents
    },
    quantity: item.quantity,
  }));

  // Fallback: if no line items, create a single item with total amount
  if (lineItems.length === 0) {
    lineItems.push({
      price_data: {
        currency: currency,
        product_data: {
          name: "Order Payment",
          description: `Order ${orderId}`,
        },
        unit_amount: amountInCents,
      },
      quantity: 1,
    });
  }

  // Create Stripe Checkout Session
  // This generates a hosted payment page that handles payment collection
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    // Redirect the user back to the React app after checkout.
    // Backend confirmation happens via webhook — this redirect is only for UX.
    success_url: `${FRONTEND_URL}/orders?paymentSuccess=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/orders?paymentSuccess=0&session_id={CHECKOUT_SESSION_ID}`,
    metadata: {
      orderId: orderId, // Store orderId for webhook processing
    },
    // Store orderId in client_reference_id for easy retrieval
    client_reference_id: orderId,
  });

  return {
    provider: "stripe",
    providerReference: session.id, // Stripe session ID
    paymentUrl: session.url, // URL to redirect user to for payment
    sessionId: session.id,
    message: "Redirect user to Stripe Checkout URL to complete payment.",
  };
};
