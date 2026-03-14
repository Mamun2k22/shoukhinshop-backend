
import { Product, Category, } from '../model/index.model.js'

// // Add new category
// export const addCategory = async (req, res) => {
//   const { categoryName, image } = req.body;
//   if (!categoryName || !image) {
//     return res.status(400).send({ message: "Category name and image URL are required" });
//   }
//   try {
//     const newCategory = new Category({ name: categoryName, image });
//     await newCategory.save();
//     res.status(201).send({ message: "Category added successfully", category: newCategory });
//   } catch (error) {
//     console.error("Error adding category:", error);
//     res.status(500).send({ message: "Server error" });
//   }
// };
// Add new category (with slug)
const slugify = (s = "") =>
  s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");

export const addCategory = async (req, res) => {
  const { categoryName, image } = req.body;

  if (!categoryName || !image) {
    return res
      .status(400)
      .send({ message: "Category name and image URL are required" });
  }

  try {
    const name = categoryName.trim();
    const slug = slugify(name);

    // optional: prevent duplicate slug/name nicely
    const exists = await Category.findOne({
      $or: [{ name }, { slug }],
    });

    if (exists) {
      return res.status(409).send({
        message: "Category already exists with same name/slug",
      });
    }

    const newCategory = new Category({
      name,
      slug,  // ✅ save slug
      image,
    });

    await newCategory.save();

    res.status(201).send({
      message: "Category added successfully",
      category: newCategory,
    });
  } catch (error) {
    console.error("Error adding category:", error);

    // Handle unique constraint error
    if (error?.code === 11000) {
      return res.status(409).send({
        message: "Category name/slug must be unique",
      });
    }

    res.status(500).send({ message: "Server error" });
  }
};
// Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({});
    res.status(200).send(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
};
export const getProductsByCategory = async (req, res) => {
  try {
    const { name } = req.params; // this is slugOrName actually
    const limit = parseInt(req.query.limit) || 0;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const decoded = decodeURIComponent(name);

    // ✅ match by slug OR name (case-insensitive)
    const category = await Category.findOne({
      $or: [
        { slug: decoded },
        { name: decoded },
        { name: { $regex: `^${decoded}$`, $options: "i" } },
        { slug: { $regex: `^${decoded}$`, $options: "i" } },
      ],
    });

    if (!category) {
      return res.status(404).send({ message: "Category not found" });
    }

    const query = { categories: category._id };

    let productsQuery = Product.find(query).sort({ createdAt: -1 });
    if (limit) productsQuery = productsQuery.skip(skip).limit(limit);

    const products = await productsQuery;

    // ✅ empty হলেও 404 না দিয়ে empty array দিলে UI stable থাকে
    return res.status(200).send(products);
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
};
// ✅ Update category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName, image } = req.body;

    if (!categoryName && !image) {
      return res
        .status(400)
        .send({ message: "Nothing to update. Provide name or image." });
    }

    const updateData = {};

    // ✅ name update + slug update together
    if (categoryName) {
      updateData.name = categoryName;
      updateData.slug = slugify(categoryName);
    }

    if (image) updateData.image = image;

    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedCategory) {
      return res.status(404).send({ message: "Category not found" });
    }

    res.status(200).send({
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
}
  // ✅ Delete category by ID
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).send({ message: "Category not found" });
    }
    res.status(200).send({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
};
