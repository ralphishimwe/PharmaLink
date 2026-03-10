const express = require("express");
const authController = require("../controllers/authController");
const paymentController = require("../controllers/paymentController");


const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router.route("/").get(paymentController.getAllPayments).post(
  authController.restrictTo("user", "admin"),
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
