const express = require("express");
const authController = require("../controllers/authController");
const inventoryController = require("../controllers/inventoryController");

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

// Staff: inventory for the staff user's assigned pharmacy
router.get("/my", authController.restrictTo("staff"), inventoryController.getMyInventory);

router
  .route("/")
  .get(authController.restrictTo("admin"), inventoryController.getAllInventories)
  .post(
    authController.restrictTo("staff", "admin"),
    inventoryController.createInventoryForStaffOrAdmin
  );

router
  .route("/:id")
  .get(authController.restrictTo("admin"), inventoryController.getInventory)
  .patch(
    authController.restrictTo("staff", "admin"),
    inventoryController.updateInventoryForStaffOrAdmin
  )
  .delete(
    authController.restrictTo("staff", "admin"),
    inventoryController.deleteInventoryForStaffOrAdmin
  );

module.exports = router;
