import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    title: "Majhi Navi Mumbai",
    description: "API documentation for Justdial Clone",
    version: "1.0.0",
  },
  host: "localhost:5005",
  schemes: ["http"], 
  basePath: "/api",
  consumes: ["application/json"],
  produces: ["application/json"],
  tags: [
    {
      name: "Business",
      description: "Endpoints related to businesses",
    },
    {
      name: "User",
      description: "Endpoints related to users",
    },
  ],
};

const outputFile = "./src/swagger.json"; 
const endpointsFiles = ["./src/routes/index.js"]; 

swaggerAutogen()(outputFile, endpointsFiles);
