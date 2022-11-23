const express = require("express");
const app = express();
const mongoose = require("mongoose");
require("dotenv").config();

const logger = require("morgan");
const cors = require("cors");

require("./config/config-passport.js");

const contactsRouter = require("./routes");

const formatsLogger = app.get("env") === "development" ? "dev" : "short";

app.use(logger(formatsLogger));
app.use(cors());
app.use(express.json());

app.use("/api/contacts", contactsRouter);

app.use((req, res) => {
  res.status(404).json({
    message: `Use api on routes: 
    /api/contacts/users/signup - registration user {email, password}
    /api/contacts/users/login - login {email, password}
    /api/contacts/users/current - get message if user is authenticated
    /api/contacts/users/logout - get message if user is logged out
  `,
    data: "Not found",
  });
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST;

const connection = mongoose.connect(DB_HOST);

connection
  .then(() => {
    app.listen(PORT, function () {
      console.log(`Server running. Use our API on port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(`Server not running. Error message: ${err.message}`);
    process.exit(1);
  });
