const mongoose = require("mongoose");
const validator = require("validator");
const slugify = require("slugify");
const geocoder = require("../utils/geocoder");

const pharmacySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A pharmacy must have a Name"],
      trim: true,
    },
    slug: String,
    email: {
      type: String,
      required: [true, "A pharmacy must have an Email"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please Provide a Valid Email"],
    },
    photo: String,
    phone: {
      type: Number,
      unique: true,
      required: [true, "A pharmacy must provide phone number"],
    },
    address: {
      type: String,
      required: [true, "Pharmacy must have an Address"],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: "2dsphere",
      },
      formattedAddress: String,
      city: String,
      country: String,
    },
    openingHours: {
      type: String,
      required: [true, "A Pharmacy must have opening hours"],
    },
    staff: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "A Pharmacy must have a staff account"],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

pharmacySchema.index({ slug: 1 });

// Geocode address before saving
pharmacySchema.pre("save", async function (next) {
  if (!this.isModified("address")) return next();

  try {
    const res = await geocoder.geocode(this.address);

    if (res && res.length > 0) {
      this.location = {
        type: "Point",
        coordinates: [res[0].longitude, res[0].latitude],
        formattedAddress: res[0].formattedAddress || this.address,
        city: res[0].city || "",
        country: res[0].country || "",
      };
    }
  } catch (err) {
    console.error("Geocoding error:", err);
    // Continue without location if geocoding fails
  }
  next();
});

//virtual populate
pharmacySchema.virtual("users", {
  ref: "User",
  foreignField: "staff",
  localField: "_id",
  select: "name address email phone",
});

// Document Middleware Runs before .save() and .create() Only not on insert..
pharmacySchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});


pharmacySchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  // console.log(docs);
  next();
});

const Pharmacy = mongoose.model("Pharmacy", pharmacySchema);

module.exports = Pharmacy;
