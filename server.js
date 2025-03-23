import express from "express";
import { config, securityMiddlewares, logger } from "./config/index.js";
import routes from "./src/routes/index.js";

const app = express();

securityMiddlewares(app);

app.use(express.json());
app.use("/api", routes);

app.listen(config.PORT, () => {
  logger.info(` Server running on port ${config.PORT}`);
});
