const express = require('express');
const passport = require('passport');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const User = require('../models/user');
const Trail = require('../models/trail');
const middleware = require('../middleware');
const cloudinary = require('../libs/cloudinary');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('landing');
});

router.get('/register', (req, res) => {
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

router.get('/login', (req, res) => {
  res.render('login', { page: 'login' });
});

router.post('/login', passport.authenticate('local', { successRedirect: '/trails', failureRedirect: '/login' }));

router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success', 'Logged you out!');
  res.redirect('/trails');
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
    const smtpTransport = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'chriswong8257@gmail.com',
        pass: process.env.GMAIL_PW
      }
    });
    const mailOptions = {
      to: user.email,
      from: 'chriswong8257@gmail.com',
      subject: 'Password Reset',
      text: `
          Hello ${savedUser.firstName},
  
          You have requested a new password for your HikingTrails account.
  
          Please click this link to set your new password:
          http://${req.headers.host}/reset/${savedUser.resetPasswordToken}
  
          For security reasons, this link will expire in 60 minutes.
  
          Best,
          HikingTrails
        `
    };
    await smtpTransport.sendMail(mailOptions);
    req.flash('success', `An email has been sent to ${savedUser.email} with further instructions`);
    res.redirect('/login');
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/forgot');
  }
});

router.get('/reset/:resetPasswordToken', (req, res) => {
  const { resetPasswordToken } = req.params;

  User.findOne({ resetPasswordToken, resetPasswordExpires: { $gt: Date.now() } })
    .then(user => {
      if (!user) {
        req.flash('error', 'Password reset link is invalid or has expired');
        res.redirect('/forgot');
      } else {
        res.render('reset', { resetPasswordToken });
      }
    })
    .catch(err => {
      req.flash('error', 'Something went wrong!');
      res.redirect('/forgot');
    });
});

router.post('/reset/:resetPasswordToken', (req, res) => {
  const { password, confirm } = req.body;
  const { resetPasswordToken } = req.params;

  User.findOne({ resetPasswordToken, resetPasswordExpires: { $gt: Date.now() } })
    .then(user => {
      if (!user) {
        Promise.reject({ reason: 'Password reset link is invalid or has expired', redirect: '/forgot' });
      } else if (password !== confirm) {
        Promise.reject({ reason: 'Passwords do not match', redirect: 'back' });
      } else {
        return user.setPassword(password);
      }
    })
    .then(
      user => {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        return user.save();
      },
      err => {
        req.flash('error', err.reason);
        res.redirect(err.redirect);
      }
    )
    .then(user => {
      return new Promise((resolve, reject) => {
        req.logIn(user, err => {
          if (err) {
            return reject(err);
          } else {
            resolve(user);
          }
        });
      });
    })
    .then(user => {
      return new Promise((resolve, reject) => {
        const smtpTransport = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: 'chriswong8257@gmail.com',
            pass: process.env.GMAIL_PW
          }
        });
        const mailOptions = {
          to: user.email,
          from: 'chriswong8257@gmail.com',
          subject: 'Your password changed',
          text: `
            Hi ${user.firstName},
  
            This is a confirmation that the password for your account ${user.email} was recently changed.
  
            Best,
            HikingTrails
          `
        };
        smtpTransport.sendMail(mailOptions, err => {
          if (err) {
            return reject(err);
          }
          resolve(user);
        });
      });
    })
    .then(() => {
      req.flash('success', 'Success! Your password has been changed');
      res.redirect('/trails');
    })
    .catch(err => {
      req.flash('error', 'Something went wrong!');
      res.redirect('/forgot');
    });
});

module.exports = router;
