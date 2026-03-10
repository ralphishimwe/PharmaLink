const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  //Remove password from output when Signing up
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

//adding Rwanda to the address in case it was not added
const addCountry = addr => {
  if (!addr) return "Rwanda";
  if (!/rwanda/i.test(addr)) addr = `${addr.trim()}, Rwanda`;
  return addr;
};

exports.signup = catchAsync(async (req, res, next) => {
  const fullAddress = addCountry(req.body.address);

  const newUser = await User.create({
    fullname: req.body.fullname,
    email: req.body.email,
    phone: req.body.phone,
    address: fullAddress,
    photo: req.body.photo,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1. Check if the email and password exist in Request
  if (!email || !password) {
    return next(new AppError('Please provide your Email and Password!!', 400));
  }

  //2. Check if the email and password Actually Exist
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect Email or Password', 401));
  }

  //3. If everything is OK
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1. Getting token and checking if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  // console.log(token);
  if (!token) {
    return next(
      new AppError('You are Not logged in, Please login to get access', 401),
    );
  }
  //2. Verifcation for token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3. check if user is still Exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('Token belongs Non-Existing User', 401));
  }

  //4. Check if user changed Password after token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password. Please Login Again.', 401),
    );
  }

  // Grant Access to Protected Route
  req.user = currentUser;

  next();
});

exports.isLoggedIn = catchAsync(async (req, res, next) => {
  //1. Getting token and checking if it's there
  if (req.cookies.jwt) {
    //2. Verifcation for token
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET,
    );

    //3. check if user is still Exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next();
    }

    //4. Check if user changed Password after token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next();
    }

    // Grant Access to Protected Route
    res.locals.user = currentUser;
    return next();
  }

  next();
});

// Middleware to protect rendered views: redirects unauthenticated users
exports.requireLogin = (req, res, next) => {
  if (!res.locals.user) {
    return res.redirect('/login');
  }
  next();
};

// Log out user (for rendered views) by clearing the JWT cookie
exports.logout = (req, res) => {
  res.clearCookie('jwt');
  return res.redirect('/');
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles is an array ['admin','lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this Action!', 403),
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1. Get user on POSTed Email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address', 404));
  }
  //2. Generate the random Reset Token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });


  if(req.originalUrl.startsWith('/api/')){
    
  }

  //3. Send it to user's email backendAPI
  // const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  // const message = `Forgot your Password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;


  //3. Send it to user's email frontend
  const resetURL = `${req.protocol}://${req.get('host')}/resetPassword/${resetToken}`;
  const message = `
          Umukozi

          Forgot your password?
          Click the link below to reset it:

          ${resetURL}

          This link will expire in 10 minutes.
          If you didn't request this, please ignore this email.
          `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your Password Reset Token (Valid for 10 Min)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token set to Email!!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an issue sending Email. Try again Later!', 500),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Get User based on Token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2. If token has not expired and there is user, set the new password
  if (!user) {
    return next(new AppError('Token Invalid or Expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // 3. Update changedPasswordAt property for user
  // 4. Log the user in, send JWT
  createSendToken(user, 201, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1. Get User from collection
  const user = await User.findById(req.user._id).select('+password');

  //2. Check if POSTed password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your Current password is Wrong.', 401));
  }
  //3. If so Update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save(); // User.findbyIdAndUpdate will not work as intended only save or create

  //4. Log user In, send JWT
  createSendToken(user, 200, res);
});
