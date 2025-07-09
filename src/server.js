import express from "express";
import { config, securityMiddlewares, logger } from "./config/index.js";
import routes from "./routes/index.js";
// import swaggerUi from "swagger-ui-express";
import fs from "fs";
import dotenv from "dotenv";
import path from 'path'
import { fileURLToPath } from "url";

const app = express();

securityMiddlewares(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
app.use(express.json());
app.use("/api", routes);
// const swaggerFile = JSON.parse(fs.readFileSync("./src/swagger.json", "utf8"));
// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use("/uploads/:imageName", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  const imageName = req.params.imageName;
  const imagePath = path.join(__dirname, "../uploads/business_photos", imageName);

  if (fs.existsSync(imagePath)) {
    const ext = path.extname(imageName).toLowerCase();
    if (ext === ".jpg") res.setHeader("Content-Type", "image/jpeg");
    else if (ext === ".png") res.setHeader("Content-Type", "image/png");
    else if (ext === ".webp") res.setHeader("Content-Type", "image/webp");

    res.sendFile(imagePath);
  } else {
    console.log("❌ Image not found:", imagePath);
    res.status(404).send("Image not found");
  }
});
app.listen(config.PORT,'0.0.0.0', () => {
  logger.info(` Server running on port  http://localhost:${config.PORT}`);
  console.log(`Swagger Docs available at http://localhost:${config.PORT}/api-docs`);

});
