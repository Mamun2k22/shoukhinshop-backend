import { Brand } from "../model/index.model.js";

export const addBrand = async (req, res) => {
  try {
    const { name, website, isActive } = req.body;
    const file = req.file;           // <- multer e file

    if (!name || !file) {
      return res
        .status(400)
        .json({ message: "Brand name and logo file are required" });
    }

    const logoPath = `/uploads/${file.filename}`;

    const brand = new Brand({
      name,
      logo: logoPath,
      website: website || "",
      isActive: typeof isActive === "string" ? isActive === "true" : !!isActive,
    });

    await brand.save();

    res
      .status(201)
      .json({ message: "Brand added successfully", brand });
  } catch (error) {
    console.error("Error adding brand:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// GET আগের মতই
export const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({}).sort({ createdAt: -1 });
    res.status(200).json(brands);
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// UPDATE
export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, website, isActive } = req.body;
    const file = req.file;

    const updateData = {};
    if (name) updateData.name = name;
    if (website !== undefined) updateData.website = website;
    if (typeof isActive !== "undefined") {
      updateData.isActive =
        typeof isActive === "string" ? isActive === "true" : !!isActive;
    }
    if (file) {
      updateData.logo = `/uploads/${file.filename}`;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const brand = await Brand.findByIdAndUpdate(id, updateData, { new: true });

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res
      .status(200)
      .json({ message: "Brand updated successfully", brand });
  } catch (error) {
    console.error("Error updating brand:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// DELETE আগের মতই
export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Brand.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res
      .status(200)
      .json({ message: "Brand deleted successfully", brand: deleted });
  } catch (error) {
    console.error("Error deleting brand:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
