const express = require("express");
const authController = require("../controllers/authController");
const inventoryController = require("../controllers/inventoryController");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(inventoryController.getAllInventories)
  .post(
    authController.protect,
    authController.restrictTo("staff", "admin"),
    inventoryController.createInventory
  );

router.use(authController.protect);

router
  .route("/:id")
  .get(inventoryController.getInventory)
  .patch(
    authController.restrictTo("staff", "admin"),
    inventoryController.updateInventory
  )
  .delete(
    authController.restrictTo("staff", "admin"),
    inventoryController.deleteInventory
  );

module.exports = router;
