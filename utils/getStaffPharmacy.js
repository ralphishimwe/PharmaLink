const Pharmacy = require("../models/pharmacyModel");
const AppError = require("./appError");

/**
 * Helper to fetch the pharmacy assigned to a staff user.
 * Used to enforce staff-based access control (Pharmacy.staff -> User).
 *
 * @param {string|ObjectId} staffUserId
 * @returns {Promise<PharmacyDocument>}
 */
module.exports = async function getStaffPharmacy(staffUserId) {
  const pharmacy = await Pharmacy.findOne({ staff: staffUserId });

  if (!pharmacy) {
    throw new AppError("No pharmacy assigned to this staff", 404);
  }

  return pharmacy;
};

