import { Banner } from "../model/index.model.js";

// POST: Add a new banner
export const addBanner = async (req, res) => {
  const { title } = req.body;
  const image = req.file;

  if (!image) {
    return res.status(400).json({ message: "Image is required" });
  }

  const imageUrl = `/uploads/${image.filename}`; // Save relative path

  try {
    const newBanner = new Banner({
      imageUrl,
      title: title || "",
    });

    await newBanner.save();
    res.status(201).json({ message: "Banner uploaded successfully", banner: newBanner });
  } catch (error) {
    console.error("Error uploading banner:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// GET: Fetch all banners
export const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ uploadedAt: -1 });
    res.status(200).json(banners);
  } catch (error) {
    console.error("Error fetching banners:", error);
    res.status(500).json({ message: "Failed to fetch banners" });
  }
};

// DELETE: Remove a banner by ID
export const deleteBanner = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Banner.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.status(200).json({ message: "Banner deleted successfully", banner: deleted });
  } catch (error) {
    console.error("Error deleting banner:", error);
    res.status(500).json({ message: "Failed to delete banner" });
  }
};
