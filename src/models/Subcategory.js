import { DataTypes } from "sequelize";

export default (sequelize) =>
  sequelize.define(
    "Subcategory",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      category_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(255), allowNull: false },
    },
    { timestamps: true, tableName: "subcategories" }
  );
