// userController.js
import bcrypt from "bcryptjs";
import { User, AddToCart} from '../model/index.model.js'
import jwt from 'jsonwebtoken';

// Controller function to get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    if (!users.length) {
      return res.status(404).json({ message: "No users found" });
    }
    res.status(200).json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// Delete user by ID

export const deleteUserById = async (req, res) => {
    const { id } = req.params;
    console.log(req.params)
    try {
      const deletedUser = await User.findByIdAndDelete(id);
      if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  // ✅ আমার প্রোফাইল (GET)
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;           // ensureAuth/protect middleware সেট করে
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ user });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
// userController.js

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      mobile,
      bio,
      profileImage,
      gender,
      dateOfBirth,
      address,
    } = req.body;

    if (
      !name &&
      !mobile &&
      !bio &&
      !profileImage &&
      !gender &&
      !dateOfBirth &&
      !address
    ) {
      return res.status(400).json({ message: "No fields to update." });
    }

    const updateData = {
      ...(name && { name }),
      ...(mobile && { mobile }),
      ...(bio && { bio }),
      ...(profileImage && { profileImage }),
      ...(gender && { gender }),              // optional
      ...(address && { address }),
    };

    // DOB আলাদা করে handle করলাম যাতে string থেকেও Date সেট হয়
    if (dateOfBirth) {
      // ধরলাম frontend থেকে "2025-12-24" আসছে
      updateData.dateOfBirth = new Date(dateOfBirth);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
      select: "-password",
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = jwt.sign(
      { id: updatedUser._id, email: updatedUser.email, role: updatedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
      token,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// userController.js
export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id; // protect middleware set করবে

    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }

    // 🔑 password field ডিফল্টে select:false, তাই +password দিতে হবে
    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // current password check
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    // বা: const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect" });
    }

    // নতুন password সেট করে save করলে pre('save') hook এ hash হবে
    user.password = newPassword;
    await user.save();

    // চাইলে নতুন token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res
      .status(200)
      .json({ message: "Password updated successfully", token });
  } catch (err) {
    console.error("Error changing password:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Update user role (Admin/Superadmin only)
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowed = ["user", "admin", "superadmin"];
    if (!allowed.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // ✅ only superadmin can assign superadmin
    if (role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only superadmin can assign superadmin" });
    }

    // ✅ optional safety: cannot change own role
    if (String(req.user.id) === String(id)) {
      return res.status(400).json({ message: "You cannot change your own role" });
    }

    const updated = await User.findByIdAndUpdate(id, { role }, { new: true }).select("-password");
    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({
      message: "Role updated successfully",
      user: updated,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
