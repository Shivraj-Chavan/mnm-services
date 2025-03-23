import { DataTypes } from "sequelize";

export default (sequelize) =>
  sequelize.define(
    "Payment",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      business_id: { type: DataTypes.INTEGER, allowNull: false },
      plan: { type: DataTypes.ENUM("normal", "gold", "platinum", "prime") },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      transaction_id: { type: DataTypes.STRING(100), unique: true, allowNull: false },
      status: { type: DataTypes.ENUM("pending", "completed", "failed"), defaultValue: "pending" },
    },
    { timestamps: true, tableName: "payments" }
  );
  