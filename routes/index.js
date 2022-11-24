const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const passport = require("passport");
const User = require("../service/schemas/users");
const ctrlContact = require("../controller");

// contacts CRUD
router.get("/", ctrlContact.get);
router.get("/:id", ctrlContact.getById);
router.post("/", ctrlContact.create);
router.delete("/:id", ctrlContact.remove);
router.put("/:id", ctrlContact.update);
router.patch("/:id/status", ctrlContact.updateStatusContact);

// user authentication
require("dotenv").config();
const secret = process.env.SECRET;

const auth = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (!user || err) {
      return res.status(401).json({
        status: "error",
        code: 401,
        message: "Not authorized",
        data: "Unauthorized",
      });
    }
    req.user = user;
    next();
  })(req, res, next);
};

router.post("/users/login", async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !user.validPassword(password)) {
    return res.status(401).json({
      status: "401 Unauthorized",
      code: 401,
      message: "Email or password is wrong",
      data: "Bad request",
    });
  }

  const payload = {
    id: user.id,
    email: user.email,
  };

  const token = jwt.sign(payload, secret, { expiresIn: "1h" });
  res.json({
    status: "success",
    code: 200,
    data: {
      token,
      user: {
        email: `${email}`,
        subscription: "starter",
      },
    },
  });
});

router.post("/users/signup", async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user) {
    return res.status(409).json({
      status: "error",
      code: 409,
      message: "Email is already in use",
      data: "Conflict",
    });
  }
  try {
    const newUser = new User({ email });
    newUser.setPassword(password);
    await newUser.save();
    res.status(201).json({
      status: "success",
      code: 201,
      data: {
        message: {
          email: `${email}`,
          subscription: "starter",
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/users/logout", auth, (req, res, next) => {
  const { token } = req.user;
  User.findOneAndRemove(token);

  res.json({
    Status: "204 No Content",
  });
});

router.get("/users/current", auth, (req, res, next) => {
  const { email } = req.user;

  res.json({
    status: "success",
    code: 200,
    data: {
      message: `Authorization was successful: ${email}`,
      user: {
        email: `${email}`,
        subscription: "starter",
      },
    },
  });
});

module.exports = router;
