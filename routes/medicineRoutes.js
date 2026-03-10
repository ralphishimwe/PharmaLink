const express = require("express");
const authController = require("../controllers/authController");
const medicineController = require("../controllers/medicineController");

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route("/")
  .get(medicineController.getAllMedicines)
  .post(authController.restrictTo("admin"), medicineController.createMedicine);

router
  .route("/:id")
  .get(medicineController.getMedicine)
  .patch(authController.restrictTo("admin"), medicineController.updateMedicine)
  .delete(
    authController.restrictTo("admin"),
    medicineController.deleteMedicine,
  );

module.exports = router;
