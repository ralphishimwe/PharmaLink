const express = require("express");
const catchAsync = require("../utils/catchAsync");
const authController = require("../controllers/authController");
const paymentController = require("../controllers/paymentController");

 const router = express.Router({ mergeParams: true });

// Webhook is called by Stripe (no user session).
// We capture raw bytes in `app.js` (express.json verify hook) and use them for signature verification.
router.post("/webhook", paymentController.webhook);

// Success page after Stripe payment
router.get('/success', catchAsync(async (req, res, next) => {
  const { session_id } = req.query;
  
  res.status(200).json({
    status: 'success',
    message: 'Payment completed successfully',
    sessionId: session_id,
  });
}));

// Cancel page if user cancels payment
router.get('/cancel', catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'fail',
    message: 'Payment cancelled by user',
  });
}));

router.use(authController.protect);

// Initiate payment (creates/reuses pending payment + returns provider URL)
router.post(
  "/initiate",
  authController.restrictTo("user", "admin"),
  paymentController.initiatePayment,
);

router
  .route("/")
  .get(authController.restrictTo("admin"), paymentController.getAllPayments)
  .post(authController.restrictTo("admin"), paymentController.createPayment);
router
  .route("/:id")
  .get(paymentController.getPayment)
  .patch(
    authController.restrictTo("staff", "admin"),
    paymentController.updatePayment,
  )
  .delete(authController.restrictTo("admin"), paymentController.deletePayment);

module.exports = router;
