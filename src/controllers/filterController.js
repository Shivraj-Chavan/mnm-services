import { insert, find } from "../utils/dao.js";
import logger from "../config/logger.js";

export const createFilter = async (req, res) => {
  try {
    const { category_id, name, filter_type } = req.body;
    await insert("filters", { category_id, name, filter_type });

    res.status(201).json({ msg: "Filter created successfully" });
  } catch (error) {
    logger.error("Create Filter Error", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getFilteredBusinesses = async (req, res) => {
  try {
    const { category_id, filter_id, filter_value } = req.query;

    const businesses = await find(
      "businesses b",
      { "b.category_id": category_id, "bf.filter_id": filter_id, "bf.filter_value": filter_value },
      [],
      "INNER JOIN business_filters bf ON b.id = bf.business_id"
    );

    res.status(200).json(businesses);
  } catch (error) {
    logger.error("Get Filtered Businesses Error", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
