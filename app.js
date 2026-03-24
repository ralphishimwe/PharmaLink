const path = require("path");
const express = require("express");
const cors = require("cors");
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

// Enable CORS.
// In development:  FRONTEND_URL is not set, so only localhost Vite ports are allowed.
// In production:   FRONTEND_URL=https://your-app.vercel.app on Render so the
//                  deployed frontend is also allowed.
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server).
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} is not allowed`));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//Rate Limiting user requests from same API
// 500 requests per 15 minutes per IP — generous enough for facilitator/demo
// testing while still protecting against automated abuse.
const limiter = rateLimit({
  max: 500,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: "Too many requests from this IP, please try again in 15 minutes.",
  standardHeaders: true,  // Return rate-limit info in RateLimit-* headers
  legacyHeaders: false,
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
