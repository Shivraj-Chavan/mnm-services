import { find, update, remove } from "../utils/dao.js";

export const getUsers = async (req, res) => {
  try {
    const users = await find("users");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await find("users", { id: req.params.id });
    if (!user.length) return res.status(404).json({ msg: "User not found" });

    res.status(200).json(user[0]);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const updated = await update("users", req.body, { id: req.params.id });
    if (!updated) return res.status(400).json({ msg: "Update failed" });

    res.status(200).json({ msg: "User updated successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const deleted = await remove("users", { id: req.params.id });
    if (!deleted) return res.status(400).json({ msg: "Delete failed" });

    res.status(200).json({ msg: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
