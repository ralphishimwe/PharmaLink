const express = require("express");
const authController = require("../controllers/authController");
const inventoryController = require("../controllers/inventoryController");

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route("/")
  .get(authController.restrictTo("admin"), inventoryController.getAllInventories)
  .post(
    authController.restrictTo("staff", "admin"),
    inventoryController.createInventory
  );

router
  .route("/:id")
  .get(authController.restrictTo("admin"), inventoryController.getInventory)
  .patch(
    authController.restrictTo("staff", "admin"),
    inventoryController.updateInventory
  )
  .delete(
    authController.restrictTo("staff", "admin"),
    inventoryController.deleteInventory
  );

module.exports = router;
