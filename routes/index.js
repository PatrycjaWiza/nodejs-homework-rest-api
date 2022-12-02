const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const passport = require("passport");
const User = require("../service/schemas/users");
const ctrlContact = require("../controller");

const { nanoid } = require("nanoid");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const Jimp = require("jimp");
const gravatar = require("gravatar");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const uploadDir = path.join(__dirname, "../temp");
const storeImage = path.join(__dirname, "../public/avatars");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
  limits: {
    fileSize: 1048576,
  },
});
const upload = multer({
  storage: storage,
});

// contacts CRUD
router.get("/contacts", ctrlContact.get);
router.get("/contacts/:id", ctrlContact.getById);
router.post("/contacts", ctrlContact.create);
router.delete("/contacts/:id", ctrlContact.remove);
router.put("/contacts/:id", ctrlContact.update);
router.patch("/contacts/:id/status", ctrlContact.updateStatusContact);

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
      status: "Unauthorized",
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
      ...user,
      // user: {
      // email: `${email}`,
      // subscription: "starter",
      // },
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
    const avatarURL = gravatar.url(email, { s: "250" });
    const verificationToken = nanoid();
    const newUser = new User({ email, avatarURL, verificationToken });
    newUser.setPassword(password);
    await newUser.save();
    res.status(201).json({
      status: "success",
      code: 201,
      data: {
        message: {
          ...user,
          // email: `${email}`,
          // subscription: "starter",
          // avatarURL, verificationToken
        },
      },
    });
    const msg = {
      to: user.email,
      from: "patrycja.wiza@gmail.com",
      subject: `Sending email from ${user.email}`,
      text: `Click following link to verify your email: /users/verify/:${user.verificationToken}`,
    };
    await sgMail.send(msg);
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
  const { email, avatarURL } = req.user;

  res.json({
    status: "success",
    code: 200,
    data: {
      message: `Authorization was successful: ${email}`,
      user: {
        email,
        subscription: "starter",
        avatarURL,
      },
    },
  });
});
// change avatar
router.patch(
  "/users/avatars",
  auth,
  upload.single("avatar"),
  async (req, res, next) => {
    const { path: temporaryName, originalname } = req.file;

    await Jimp.read(`'${temporaryName}'`)
      .then((image) => {
        return image.resize(250, 250).write(`'${temporaryName}'`);
      })
      .catch((err) => {
        console.error(err);
      });

    try {
      const { authorization } = req.headers;
      // eslint-disable-next-line no-unused-vars
      const [_, token] = authorization.split(" ");
      const { _id } = jwt.verify(token, secret);

      const newFileName = `${token
        .split(".")
        .reverse()
        .splice(0, 1)}.${originalname}`;
      const fileName = path.join(storeImage, newFileName);
      await fs.rename(temporaryName, fileName);

      const avatarURL = path.join("/avatars", newFileName);
      const user = await User.findByIdAndUpdate(
        _id,
        { avatarURL },
        { new: true }
      );
      console.log(user);
      res.json({
        message: "File sent successfully",
        status: 200,
        avatarURL,
        user,
      });
    } catch (err) {
      await fs.unlink(temporaryName);
      return next(err);
    }
  }
);
// email verification - sendGrid
router.get("/users/verify/:verificationToken", async (req, res, next) => {
  const { verificationToken } = req.params;
  const user = await User.findOne({ verificationToken });
  if (!user) {
    return res.status(404).json({
      status: 404,
      message: "User not found",
    });
  } else {
    try {
      user.verificationToken = null;
      user.verify = true;
      user.save();
      res.json({ message: "Verification successful", status: 200, ...user });
    } catch (err) {
      return next(err);
    }
  }
});
router.post("/users/verify", async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!email) {
    return res.status(400).json({
      status: 400,
      message: "missing required field email",
    });
  } else {
    try {
      if (!user.verificationToken) {
        const msg = {
          to: user.email,
          from: "patrycja.wiza@gmail.com",
          subject: `Sending email from ${user.email}`,
          text: `Click following link to verify your email: /users/verify/:${user.verificationToken}`,
        };
        await sgMail.send(msg);
        res.json({
          status: "OK",
          code: 200,
          message: "verification email sent",
          ...user,
        });
      } else {
        res.status(400).json({
          status: "Bad Request",
          code: 400,
          message: "verification has already been passed",
        });
      }
    } catch (err) {
      next(err);
    }
  }
});

module.exports = router;
