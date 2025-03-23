import { insert, find } from "../utils/dao.js";
import logger from "../config/logger.js";

export const createBusiness = async (req, res) => {
  try {
    const {
      owner_id,
      name,
      category_id,
      subcategory_id,
      address,
      city,
      state,
      zip_code,
      phone,
      email,
      website,
      description,
    } = req.body;

    await insert("businesses", {
      owner_id,
      name,
      category_id,
      subcategory_id,
      address,
      city,
      state,
      zip_code,
      phone,
      email,
      website,
      description,
    });

    res.status(201).json({ msg: "Business created successfully" });
  } catch (error) {
    logger.error("Create Business Error", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getBusinesses = async (req, res) => {
  try {
    const businesses = await find("businesses");
    res.status(200).json(businesses);
  } catch (error) {
    logger.error("Get Businesses Error", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
