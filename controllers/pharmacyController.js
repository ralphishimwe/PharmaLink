const Pharmacy = require("../models/pharmacyModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");
const getStaffPharmacy = require("../utils/getStaffPharmacy");

// Get pharmacies near the user or custom coordinates using MongoDB geospatial queries.
// - If lat/lng are provided as query params, use those coordinates.
// - Otherwise, use the logged-in user's saved location.
// - Uses $geoNear with a fixed radius (e.g. 10km) and returns results sorted by distance.
exports.getNearbyPharmacies = catchAsync(async (req, res, next) => {
  let { lat, lng } = req.query;

  // 1) Determine the origin point for the search
  if (lat == null || lng == null) {
    // No coordinates in query: fall back to logged-in user's location
    const user = req.user;
    if (!user || !user.location || !Array.isArray(user.location.coordinates)) {
      return next(
        new AppError(
          "No coordinates provided and user does not have a saved location",
          400,
        ),
      );
    }
    // Stored as [longitude, latitude]
    lng = user.location.coordinates[0];
    lat = user.location.coordinates[1];
  } else {
    lat = parseFloat(lat);
    lng = parseFloat(lng);
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return next(new AppError("Invalid coordinates: lat and lng must be numbers", 400));
  }

  const origin = {
    type: "Point",
    coordinates: [lng, lat], // [longitude, latitude]
  };

  // 2) Use $geoNear to find pharmacies within a radius (10km) of the origin point.
  // If no pharmacy has a valid location (or 2dsphere index is missing), we return
  // empty data instead of throwing so the client does not get a 500.
  const maxDistanceMeters = 10 * 1000; // 10km radius in meters

  let pharmacies;
  try {
    pharmacies = await Pharmacy.aggregate([
      {
        $geoNear: {
          near: origin,
          distanceField: "distanceInMeters",
          maxDistance: maxDistanceMeters,
          spherical: true,
          key: "location",
        },
      },
      {
        $project: {
          name: 1,
          address: 1,
          distanceKm: { $divide: ["$distanceInMeters", 1000] },
        },
      },
      { $sort: { distanceKm: 1 } },
    ]);
  } catch (err) {
    // No 2dsphere index or no geo data: return empty result instead of 500
    if (err.code === 291 || err.codeName === "NoQueryExecutionPlans" || err.name === "MongoServerError") {
      return res.status(200).json({
        status: "success",
        results: 0,
        data: [],
        message: "No pharmacies with location data available. Add addresses and ensure a 2dsphere index exists on Pharmacy.location.",
      });
    }
    throw err;
  }

  res.status(200).json({
    status: "success",
    results: pharmacies.length,
    data: pharmacies,
  });
});

exports.getAllPharmacies = factory.getAll(Pharmacy);
exports.getPharmacy = factory.getOne(Pharmacy, {
  path: "staff",
  select: "-__v -location -role",
});

/**
 * Staff: get the pharmacy assigned to this staff user.
 * GET /api/v1/pharmacies/my
 */
exports.getMyPharmacyForStaff = catchAsync(async (req, res, next) => {
  const pharmacy = await getStaffPharmacy(req.user.id);

  res.status(200).json({
    status: "success",
    data: {
      data: {
        _id: pharmacy._id,
        name: pharmacy.name,
      },
    },
  });
});
exports.createPharmacy = factory.createOne(Pharmacy);
exports.updatePharmacy = factory.updateOne(Pharmacy);
exports.deletePharmacy = factory.deleteOne(Pharmacy);
