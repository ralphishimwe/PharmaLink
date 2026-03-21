const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const geocoder = require("../utils/geocoder");

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: [true, "User must have a Name"],
  },
  email: {
    type: String,
    required: [true, "User must have an Email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please Provide a Valid Email"],
  },
  photo: String,
  phone: {
    type: Number,
    unique: true,
    required: [true, "user must provide phone number"],
  },
  address: {
    type: String,
    required: [true, "User must have an Address"],
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: "2dsphere",
    },
    formattedAddress: String,
    city: String,
    country: String,
  },
  role: {
    type: String,
    enum: ["user", "staff", "admin"],
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  password: {
    type: String,
    required: [true, "user must have Password"],
    minLength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "user must Confirm their Password"],
    minLength: 8,
    validate: {
      // this only works on  .save() and .create()
      validator: function (el) {
        return el === this.password;
      },
      message: "Password don't match",
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// Optional: index full GeoJSON location for potential user geo queries
userSchema.index({ location: "2dsphere" });

// Geocode address before saving (create + save)
userSchema.pre("save", async function (next) {
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

// Geocode address when user is updated via findByIdAndUpdate (e.g. PATCH)
userSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  const address = update.$set?.address ?? update.address;
  if (!address) return next();

  try {
    const res = await geocoder.geocode(address);
    if (res && res.length > 0) {
      const location = {
        type: "Point",
        coordinates: [res[0].longitude, res[0].latitude],
        formattedAddress: res[0].formattedAddress || address,
        city: res[0].city || "",
        country: res[0].country || "",
      };
      if (update.$set) {
        update.$set.location = location;
      } else {
        update.location = location;
      }
    }
  } catch (err) {
    console.error("Geocoding error on user update:", err);
  }
  next();
});

//Only run this program if the password was not modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  //Hashing passwords
  this.password = await bcrypt.hash(this.password, 12);
  //Delete the passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  //this keyword points to the current Query.
  this.find({ active: { $ne: false } });
  next();
});

//Check if the password is correct
userSchema.methods.correctPassword = async function (
  candiatePassword,
  userPassword,
) {
  return await bcrypt.compare(candiatePassword, userPassword);
};

//Check changedPassword after {Everytime password is changed time gets updated}
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  //False Means Password has been changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
