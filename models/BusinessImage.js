import { DataTypes } from "sequelize";

export default (sequelize) =>
  sequelize.define(
    "BusinessImage",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      business_id: { type: DataTypes.INTEGER, allowNull: false },
      image_url: { type: DataTypes.STRING(255), allowNull: false },
    },
    { timestamps: true, tableName: "business_images" }
  );
