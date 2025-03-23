import { DataTypes } from "sequelize";

export default (sequelize) =>
  sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(100), unique: true, allowNull: false },
      password: { type: DataTypes.STRING(255), allowNull: false },
      phone: { type: DataTypes.STRING(15), allowNull: true },
      profile_image: { type: DataTypes.STRING(255), allowNull: true },
      role: {
        type: DataTypes.ENUM("user", "business", "admin", "sub-admin"),
        defaultValue: "user",
      },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { timestamps: true, tableName: "users" }
  );
