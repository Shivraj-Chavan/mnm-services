import { DataTypes } from "sequelize";

export default (sequelize) =>
  sequelize.define(
    "Filter",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      category_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(255), allowNull: false },
      filter_type: {
        type: DataTypes.ENUM("text", "boolean", "range", "multi-select"),
        allowNull: false,
      },
    },
    { timestamps: true, tableName: "filters" }
  );
