const express = require("express");
const authController = require("../controllers/authController");
const orderController = require("../controllers/orderController");

const router = express.Router({ mergeParams: true });

router.use(authController.protect);


// Dedicated order placement flow (validated + priced from Inventory)
router.post(
  "/place",
  authController.restrictTo("user", "admin"),
  orderController.placeOrder,
);

router
  .route("/")
  .get(authController.restrictTo("admin"), orderController.getAllOrders)
  .post(
    authController.restrictTo("admin"),
    orderController.createOrder
  );


router
  .route("/:id")
  .get(orderController.getOrder)
  .patch(
    authController.restrictTo("staff", "admin"),
    orderController.updateOrder
  )
  .delete(
    authController.restrictTo("staff", "admin"),
    orderController.deleteOrder
  );

module.exports = router;
