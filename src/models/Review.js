import { DataTypes } from "sequelize";

export default (sequelize) =>
  sequelize.define(
    "Review",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      business_id: { type: DataTypes.INTEGER, allowNull: false },
      rating: { type: DataTypes.INTEGER, validate: { min: 1, max: 5 } },
      comment: { type: DataTypes.TEXT },
    },
    { timestamps: true, tableName: "reviews" }
  );
