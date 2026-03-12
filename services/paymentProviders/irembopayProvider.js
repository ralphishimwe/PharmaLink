const crypto = require("crypto");

/**
 * Simulated IremboPay initiation.
 * Keep this as a replaceable provider module so you can swap providers later.
 */
exports.initiate = async ({ orderId, amount } = {}) => {
  const providerReference = `IREMBO_${orderId}_${crypto.randomBytes(6).toString("hex")}`;

  // In a real integration you'd get a URL from the provider.
  const paymentUrl = `https://pay.irembopay.example/checkout/${providerReference}`;

  return {
    provider: "irembopay",
    providerReference,
    paymentUrl,
    message: "Complete payment using the provided URL.",
  };
};

