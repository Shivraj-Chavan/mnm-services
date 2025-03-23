import { DataTypes } from "sequelize";

export default (sequelize) =>
  sequelize.define(
    "Category",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(255), unique: true, allowNull: false },
    },
    { timestamps: true, tableName: "categories" }
  );
