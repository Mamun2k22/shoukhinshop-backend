// index.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import cookieParser from "cookie-parser";
import passport from "passport";
import fs from "fs";
import { UPLOAD_DIR } from "./config/paths.js";


import "./middleware/passport.js";
import "./db/database.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import colorRoutes from "./routes/colorRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import bannerRoutes from "./routes/BannerRoutes.js";
import sellerVerificationRoutes from "./routes/sellerVerificationRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import couponAdminRoutes from "./routes/couponAdminRoutes.js"; 
import shippingSettingsRoutes from "./routes/shippingSettingsRoutes.js";
import adminStatsRoutes from "./routes/adminStatsRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import subCategoryRoutes from "./routes/subCategoryRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import settingRoutes from "./routes/siteSettingRoutes.js"
import homeSectionSettingRoutes from "./routes/homeSectionSettingRoutes.js";
import siteTickerRoutes from "./routes/siteTickerRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import headerSettingRoutes from "./routes/headerSettingRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import generalSettingsRoutes from "./routes/generalSettingsRoutes.js";
import banggoRoutes from "./routes/banggoRoutes.js";



dotenv.config();
const app = express();
const port = process.env.PORT || 5000;
// uploads dir ensure (এক জায়গায়)
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
};

// production trust proxy
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// CORS
// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "https://zarvilalifestyle.com",
//       // "https://mmtradingcenter.com",
//       // "https://www.mmtradingcenter.com",
//     ],
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

const allowedOrigins = [
  "http://localhost:5173",
  "http://shoukhinshop.com",
  "http://www.shoukhinshop.com",
  "https://shoukhinshop.com",
  "https://www.shoukhinshop.com",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());
// parsers
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
// session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change_me",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URL }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  })
);
// passport
app.use(passport.initialize());
app.use(passport.session());

// static: serve uploads (শেয়ার্ড পাথ)
app.use("/uploads", express.static(UPLOAD_DIR, { etag: true, maxAge: "7d" }));

// health
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/readyz", (_req, res) => res.status(200).json({ up: true }));

// tiny cache
app.use((req, res, next) => {
  if (req.method === "GET" && req.path.startsWith("/api/products")) {
    res.set("Cache-Control", "private, max-age=30");
  }
  next();
});

// routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/colors", colorRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api", orderRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api", sellerVerificationRoutes);
app.use("/api", invoiceRoutes);
app.use("/api", couponRoutes); // 
app.use("/api", couponAdminRoutes);
// app.use("/api", shippingSettingsRoutes); 
app.use("/api", adminStatsRoutes);
app.use("/api", analyticsRoutes);
app.use("/api/subcategories", subCategoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/home-section-settings", homeSectionSettingRoutes);
app.use("/api", siteTickerRoutes);
app.use("/api", reportRoutes);
app.use("/api/header-settings", headerSettingRoutes);
app.use("/api/shipping-settings", shippingSettingsRoutes);
app.use("/api", reviewRoutes);
app.use("/api", generalSettingsRoutes);
app.use("/api", banggoRoutes);

// root
app.get("/", (_req, res) => res.send("Shoukhinshop Server Is Running Now"));

// 404 + error
app.use((_req, res) => res.status(404).json({ message: "Not found" }));
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

// start
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
