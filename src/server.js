import express from "express";
import { config, securityMiddlewares, logger } from "./config/index.js";
import routes from "./routes/index.js";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import dotenv from "dotenv";
const app = express();

securityMiddlewares(app);

dotenv.config();
app.use(express.json());
app.use("/api", routes);
const swaggerFile = JSON.parse(fs.readFileSync("./src/swagger.json", "utf8"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use("/uploads", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"); 
    next();
}, express.static("uploads/business_photos"));

app.listen(config.PORT,'0.0.0.0', () => {
  logger.info(` Server running on port  http://localhost:${config.PORT}`);
  console.log(`Swagger Docs available at http://localhost:${config.PORT}/api-docs`);

});
