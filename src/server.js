import express from "express";
import { config, securityMiddlewares, logger } from "./config/index.js";
import routes from "./routes/index.js";
import swaggerUi from "swagger-ui-express";
import swaggerFile from "./swagger.json" assert { type: "json" };
const app = express();

securityMiddlewares(app);

app.use(express.json());
app.use("/api", routes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.listen(config.PORT, () => {
  logger.info(` Server running on port ${config.PORT}`);
  console.log(`Swagger Docs available at http://localhost:${config.PORT}/api-docs`);

});
