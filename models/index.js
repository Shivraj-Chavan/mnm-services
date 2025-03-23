import { Sequelize } from "sequelize";
import { config } from "../config/env.js";
import User from "./User.js";
import Category from "./Category.js";
import Subcategory from "./Subcategory.js";
import Business from "./Business.js";
import BusinessImage from "./BusinessImage.js";
import Filter from "./Filter.js";
import BusinessFilter from "./BusinessFilter.js";
import Review from "./Review.js";
import Payment from "./Payment.js";
import AdminAction from "./AdminAction.js";

const sequelize = new Sequelize(config.DB_NAME, config.DB_USER, config.DB_PASSWORD, {
  host: config.DB_HOST,
  dialect: "mysql",
  port: config.DB_PORT,
  logging: false,
  pool: {
    max: 100, // Adjust based on expected traffic
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
});

const models = {
  User: User(sequelize),
  Category: Category(sequelize),
  Subcategory: Subcategory(sequelize),
  Business: Business(sequelize),
  BusinessImage: BusinessImage(sequelize),
  Filter: Filter(sequelize),
  BusinessFilter: BusinessFilter(sequelize),
  Review: Review(sequelize),
  Payment: Payment(sequelize),
  AdminAction: AdminAction(sequelize),
};

// Associations
models.User.hasMany(models.Business, { foreignKey: "owner_id" });
models.Business.belongsTo(models.User, { foreignKey: "owner_id" });

models.Category.hasMany(models.Subcategory, { foreignKey: "category_id" });
models.Subcategory.belongsTo(models.Category, { foreignKey: "category_id" });

models.Business.hasMany(models.BusinessImage, { foreignKey: "business_id" });
models.BusinessImage.belongsTo(models.Business, { foreignKey: "business_id" });

models.Business.hasMany(models.Review, { foreignKey: "business_id" });
models.Review.belongsTo(models.Business, { foreignKey: "business_id" });
models.User.hasMany(models.Review, { foreignKey: "user_id" });
models.Review.belongsTo(models.User, { foreignKey: "user_id" });

models.Business.hasMany(models.BusinessFilter, { foreignKey: "business_id" });
models.BusinessFilter.belongsTo(models.Business, { foreignKey: "business_id" });

models.Business.hasMany(models.Payment, { foreignKey: "business_id" });
models.Payment.belongsTo(models.Business, { foreignKey: "business_id" });

models.User.hasMany(models.AdminAction, { foreignKey: "admin_id" });
models.AdminAction.belongsTo(models.User, { foreignKey: "admin_id" });

export { sequelize, models };
