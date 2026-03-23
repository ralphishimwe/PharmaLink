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

// Must be before "/:id" so "my-orders" is not parsed as an id
router.get(
  "/my-orders",
  authController.restrictTo("user", "admin"),
  orderController.getMyOrders,
);

// Must be before "/:id" generic patch
router.patch(
  "/:id/cancel",
  authController.restrictTo("user", "admin"),
  orderController.cancelOrder,
);

// Must be before "/:id" so it is not treated as an order id
router.get(
  "/pharmacy-orders",
  authController.restrictTo("staff"),
  orderController.getPharmacyOrders,
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
    orderController.updateOrderStatusForStaffOrAdmin
  )
  .delete(
    authController.restrictTo("staff", "admin"),
    orderController.deleteOrderForStaffOrAdmin
  );

module.exports = router;
