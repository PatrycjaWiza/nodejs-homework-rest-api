const express = require("express");
const app = express();
const mongoose = require("mongoose");

const createError = require("http-errors");
const path = require("path");
const fs = require("fs").promises;
const uploadDir = path.join(process.cwd(), "public/avatars");
const storeImage = path.join(process.cwd(), "public/avatars");

require("dotenv").config();

const logger = require("morgan");
const cors = require("cors");

require("./config/config-passport.js");

const contactsRouter = require("./routes");

const formatsLogger = app.get("env") === "development" ? "dev" : "short";

app.use(logger(formatsLogger));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join("public")));

app.use("/", contactsRouter);

app.use((req, res, next) => {
  next(createError(404));
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.json({ message: err.message, status: err.status });
});

const isAccessible = (path) => {
  return fs
    .access(path)
    .then(() => true)
    .catch(() => false);
};

const createFolderDoesNotExist = async (folder) => {
  if (!(await isAccessible(folder))) {
    await fs.mkdir(folder);
  }
};

const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST;

const connection = mongoose.connect(DB_HOST);

connection
  .then(() => {
    app.listen(PORT, async () => {
      createFolderDoesNotExist(uploadDir);
      createFolderDoesNotExist(storeImage);
      console.log(`Server running. Use our API on port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(`Server not running. Error message: ${err.message}`);
    process.exit(1);
  });
