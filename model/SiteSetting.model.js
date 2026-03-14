// model/SiteSetting.model.js
import mongoose from "mongoose";

const siteSettingSchema = new mongoose.Schema(
  {
    logoUrl: { type: String, default: "" },     // e.g. /uploads/xxx.png
    brandName: { type: String, default: "ZARVILA" },
  },
  { timestamps: true }
);

const SiteSetting = mongoose.model("SiteSetting", siteSettingSchema);
export default SiteSetting;
