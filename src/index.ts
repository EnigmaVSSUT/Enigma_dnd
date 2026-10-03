require("dotenv").config();
import cors from 'cors'
import express from "express";
import { logger } from "./config/logger";
import { httpLogger } from "./middleware/httpLogger";
import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();

app.use(httpLogger);
app.use(cors())
app.use(express.json())

import authRouter from './routes/auth/auth.routes';
import formRouter from './routes/form/form.routes';

app.use("/api/v1/auth",authRouter);
app.use("/api/v1/form",formRouter);

app.get("/", (req, res) => {
  res.status(200).json({
    info: "Drag and drop form builder api",
    version: "v1",
    dev:"Gyanranjan Patra & Dharmendra Mahanta"
  });
});

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  logger.info(
    { port, env: process.env.NODE_ENV || "development" },
    `Server is running at http://localhost:${port}`
  );
});

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandled rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception");
  process.exit(1);
});
