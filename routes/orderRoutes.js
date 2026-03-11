const express = require("express");
const authController = require("../controllers/authController");
const orderController = require("../controllers/orderController");

const router = express.Router({ mergeParams: true });

// Dedicated order placement flow (validated + priced from Inventory)
router.post(
  "/place",
  authController.protect,
  authController.restrictTo("user", "admin"),
  orderController.placeOrder,
);

router
  .route("/")
  .get(orderController.getAllOrders)
  .post(
    authController.protect,
    authController.restrictTo("admin"),
    orderController.createOrder
  );

router.use(authController.protect);

router
  .route("/:id")
  .get(orderController.getOrder)
  .patch(
    authController.restrictTo("user", "staff", "admin"),
    orderController.updateOrder
  )
  .delete(
    authController.restrictTo("admin"),
    orderController.deleteOrder
  );

module.exports = router;
