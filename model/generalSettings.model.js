import mongoose from "mongoose";
const { Schema } = mongoose;

const GeneralSettingsSchema = new Schema(
  {
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, trim: true, default: "" },
     description: { type: String, trim: true, default: "" },

    // optional: track admin edits
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "general_settings" }
);

const GeneralSettings = mongoose.model("GeneralSettings", GeneralSettingsSchema);
export default GeneralSettings;
