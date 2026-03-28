const AppError = require("../utils/appError");

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  // Check if it's a pharmacy-medicine duplicate
  if (
    err.keyPattern &&
    err.keyPattern.pharmacy === 1 &&
    err.keyPattern.medicine === 1
  ) {
    return new AppError(
      "This pharmacy cannot list the same medicine twice.",
      400,
    );
  }

  // Generic duplicate error for other fields
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value "${value}" for ${field}. Please use another value`;
  return new AppError(message, 400);
};

//handleduplicate from Jonas
// const handleDuplicateFieldsDB = (err) => {
//   const value = err.errorResponse.keyValue.name;
//   const message = `Duplicate Field Value ${value}. Please use another value`;
//   return new AppError(message, 400);
// };

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data ${errors.join(".  ")}`;
  return new AppError(message, 400);
};

const sendErrDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const handleJWTError = () =>
  new AppError("Invalid token. Please login again", 401);

const handleJWTExpiredError = () =>
  new AppError("Your Token has Expired. Please login again", 401);

const sendErrProd = (err, res) => {
  // operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  //programming or the other unknown errors: don't leak details to client
  else {
    //1) log error
    // eslint-disable-next-line no-console
    console.error("ERROR", err);

    //2)Send Generic message to user
    res.status(500).json({
      status: "error",
      message: "Something went Very Wrong!",
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Always translate known DB/JWT errors into friendly messages so raw
  // Mongoose / MongoDB text never reaches the client in any environment.
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.statusCode = err.statusCode;
  error.status = err.status;
  error.code = err.code;
  if (err.path) error.path = err.path;
  if (err.value) error.value = err.value;
  if (err.errors) error.errors = err.errors;

  if (error.name === "CastError") error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === "ValidationError") error = handleValidationErrorDB(error);
  if (error.name === "JsonWebTokenError") error = handleJWTError();
  if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

  if (process.env.NODE_ENV === "development") {
    sendErrDev(error, res);
  } else {
    sendErrProd(error, res);
  }
};
