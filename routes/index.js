const express = require('express');
const passport = require('passport');
const crypto = require('crypto');

const User = require('../models/user');
const middleware = require('../middleware');
const cloudinary = require('../libs/cloudinary');
const nodemailer = require('../libs/nodemailer');

const router = express.Router();

router.get('/', middleware.publicRoute, (req, res) => {
  res.render('landing');
});

router.get('/register', middleware.publicRoute, (req, res) => {
  res.render('register', { page: 'register' });
});

router.post('/register', middleware.uploadImage.single('avatar'), async (req, res) => {
  const { firstName, lastName, username, password, email, biography } = req.body;

  try {
    const result = await cloudinary.v2.uploader.upload(req.file.path);
    const newUser = new User({
      firstName,
      lastName,
      email,
      username,
      biography,
      avatar: result.secure_url,
      avatarId: result.public_id
    });
    const user = await User.register(newUser, password);

    passport.authenticate('local')(req, res, () => {
      req.flash('success', `Welcome to HikingTrails ${user.username}!`);
      res.redirect('/trails');
    });
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});

router.get('/login', middleware.publicRoute, (req, res) => {
  res.render('login', { page: 'login' });
});

router.post('/login', passport.authenticate('local', { successRedirect: '/trails', failureRedirect: '/login' }));

router.get('/logout', (req, res) => {
  if (req.user) {
    req.logout();
  }
  res.redirect('/');
});

router.get('/forgot', (req, res) => {
  res.render('forgot');
});

router.post('/forgot', async (req, res) => {
  try {
    const buf = await crypto.randomBytes(20);
    const token = buf.toString('hex');
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      throw new Error("Can't find that email, sorry");
    }
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    const savedUser = await user.save();
    await nodemailer.sendPasswordReset(
      req.body.email,
      savedUser.firstName,
      req.headers.host,
      savedUser.resetPasswordToken
    );
    req.flash('success', `An email has been sent to ${savedUser.email} with further instructions`);
    res.redirect('/login');
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/forgot');
  }
});

router.get('/reset/:resetPasswordToken', async (req, res) => {
  const { resetPasswordToken } = req.params;

  try {
    const user = await User.findOne({ resetPasswordToken, resetPasswordExpires: { $gt: Date.now() } });

    if (!user) {
      throw new Error('Password reset link is invalid or has expired');
    }
    res.render('reset', { resetPasswordToken });
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/forgot');
  }
});

router.post('/reset/:resetPasswordToken', async (req, res) => {
  const { password, confirm } = req.body;
  const { resetPasswordToken } = req.params;

  try {
    let user = await User.findOne({ resetPasswordToken, resetPasswordExpires: { $gt: Date.now() } });

    if (!user) {
      throw new Error('Password reset link is invalid or has expired');
    } else if (password !== confirm) {
      throw new Error('Passwords do not match');
    }
    user = await user.setPassword(password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user = await user.save();
    req.logIn(user, async err => {
      if (err) {
        throw new Error('Something went wrong!');
      }
      await nodemailer.sendPasswordResetConfirmation(user.email, user.firstName);
      req.flash('success', 'Success! Your password has been changed');
      res.redirect('/trails');
    });
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/forgot');
  }
});

module.exports = router;
