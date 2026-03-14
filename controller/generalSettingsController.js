import GeneralSettings from "../model/generalSettings.model.js";

const ensureSingleton = async () => {
  let doc = await GeneralSettings.findOne().lean();
  if (!doc) {
    const created = await GeneralSettings.create({
      phone: "",
      email: "",
      address: "",
      description: "",
    });
    doc = created.toObject();
  }
  return doc;
};

// Public/Frontend: read only
export const getGeneralSettings = async (req, res) => {
  try {
    const doc = await ensureSingleton();
    res.status(200).json(doc);
  } catch (error) {
    res.status(500).json({ message: "Error fetching general settings", error: error.message });
  }
};

// Admin: update
export const updateGeneralSettings = async (req, res) => {
  try {
    const { phone, email, address, description } = req.body; // ✅ added description

    const existing = await ensureSingleton();

    const updated = await GeneralSettings.findByIdAndUpdate(
      existing._id,
      {
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(description !== undefined ? { description } : {}), // ✅ added
        updatedBy: req.user?._id,
        updatedAt: new Date(),
      },
      { new: true }
    );

    res.status(200).json({ message: "General settings updated", settings: updated });
  } catch (error) {
    res.status(500).json({ message: "Error updating general settings", error: error.message });
  }
};

