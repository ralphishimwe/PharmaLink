# PharmaLink

A Node.js backend for a medicine marketplace using Express, MongoDB, and Mongoose.

## Payment Integration

PharmaLink supports Stripe payment processing with the following workflow:

### Payment Flow

1. **Initiate Payment**: POST `/payments/initiate` with `orderId`
2. **Redirect to Stripe**: Frontend redirects user to returned `checkoutUrl`
3. **Complete Payment**: User pays on Stripe's hosted checkout page
4. **Webhook Processing**: Stripe sends webhook to `/payments/webhook`
5. **Order Fulfillment**: Backend updates payment/order status and deducts inventory

### Environment Variables

Add these to your `config.env`:

```
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### API Endpoints

- `POST /payments/initiate` - Create Stripe checkout session
- `POST /payments/webhook` - Handle Stripe webhooks (no auth required)

### Webhook Configuration

Configure your Stripe webhook endpoint to point to `/payments/webhook` and listen for `checkout.session.completed` events.
