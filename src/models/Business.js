import { DataTypes } from "sequelize";

export default (sequelize) =>
  sequelize.define(
    "Business",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      owner_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(255), allowNull: false },
      category_id: { type: DataTypes.INTEGER, allowNull: false },
      subcategory_id: { type: DataTypes.INTEGER, allowNull: false },
      address: { type: DataTypes.TEXT },
      city: { type: DataTypes.STRING(100) },
      state: { type: DataTypes.STRING(100) },
      zip_code: { type: DataTypes.STRING(20) },
      phone: { type: DataTypes.STRING(15) },
      email: { type: DataTypes.STRING(100) },
      website: { type: DataTypes.STRING(255) },
      description: { type: DataTypes.TEXT },
      is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { timestamps: true, tableName: "businesses" }
  );
