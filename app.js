const path = require("path");
const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const pharmacyRouter = require("./routes/pharmacyRoutes");
const userRouter = require("./routes/userRoutes");
const inventoryRouter = require("./routes/inventoryRoutes");
const orderRouter = require("./routes/orderRoutes");
const paymentRouter = require("./routes/paymentRoutes");
const medicineRouter = require("./routes/medicineRoutes");

const app = express();

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

//1) Global Middle Wares

//Serving Static Files
app.use(express.static(path.join(__dirname, "public")));

//Security Http Headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//Rate Limiting user requests from same API
const limiter = rateLimit({
  max: 100, //Going to allow 100 requests in hour below is one hour in millisecond
  windowMs: 60 * 60 * 1000, //onehour(60 minutes) * seconds(60) * millisecondsinasecond(1000)
  message: "Too many requests from this IP, please try again later.",
});

app.use("/api", limiter);

// Body parser (JSON) + capture raw bytes for Stripe webhook verification.
// Stripe requires the original request payload bytes to verify the signature.
app.use(
  express.json({
    limit: "10kb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(cookieParser());

//Data Sanitization against NoSql query Injection
app.use(mongoSanitize());

//Data Sanatization against xss
app.use(xss());

//prevent parameter pollution
// app.use(
//   hpp({
//     whitelist: [
//       "duration",
//       "ratingsQuantity",
//       "ratingsAverage",
//       "price",
//       "difficulty",
//       "maxGroupSize",
//     ],
//   })
// );

//Test Middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.cookies);
  next();
});

//3. Routes
app.use("/api/v1/pharmacies", pharmacyRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/inventories", inventoryRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/medicines", medicineRouter);

//4. Invalid urls Middleware
app.all("*", (req, res, next) => {
  // const err = new Error(`Can't find ${req.originalUrl} on this Server`);
  // err.status = 'fail';
  // err.statusCode = 404;
  next(new AppError(`Can't find ${req.originalUrl} on this Server`, 404));
});

//5. Error Handling Middleware
app.use(globalErrorHandler);

module.exports = app;
