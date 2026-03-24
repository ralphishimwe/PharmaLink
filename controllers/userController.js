const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //1. Create Error if user POST's password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This Route is not for updating password, use /updateMyPassword for password.',
        400,
      ),
    );
  }
  //2. Filtered out unwanted fields name that are not allowed to be updated.
  const filteredBody = filterObj(req.body, 'fullname', 'email', 'phone', 'address', 'photo');

  //3. update the user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = catchAsync(async (req, res, next) => {
  // Uses User.create() so all model pre-save hooks run (password hashing, geocoding, etc.)
  const newUser = await User.create({
    fullname:        req.body.fullname,
    email:           req.body.email,
    phone:           req.body.phone,
    address:         req.body.address,
    role:            req.body.role || 'user',
    photo:           req.body.photo,
    password:        req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // Never send the hashed password back
  newUser.password = undefined;

  res.status(201).json({
    status: 'success',
    data: {
      data: newUser,
    },
  });
});

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
//Do not update password with this. They won't be hashed
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
