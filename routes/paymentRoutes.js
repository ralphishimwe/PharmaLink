const express = require("express");
const authController = require("../controllers/authController");
const paymentController = require("../controllers/paymentController");


const router = express.Router({ mergeParams: true });

// Webhook is called by the payment provider (no user session).
// In production, you should validate provider signatures/secret headers here.
router.post("/webhook", paymentController.webhook);

router.use(authController.protect);

// Initiate payment (creates/reuses pending payment + returns provider URL)
router.post(
  "/initiate",
  authController.restrictTo("user", "admin"),
  paymentController.initiatePayment,
);

router.route("/").get(authController.restrictTo("admin"), paymentController.getAllPayments).post(
  authController.restrictTo("admin"),
  paymentController.createPayment,
);
router
  .route("/:id")
  .get(paymentController.getPayment)
  .patch(
    authController.restrictTo("staff", "admin"),
    paymentController.updatePayment,
  )
  .delete(authController.restrictTo("admin"), paymentController.deletePayment);

module.exports = router;
