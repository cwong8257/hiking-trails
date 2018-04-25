const express = require('express');
const passport = require('passport');

const User = require('../models/user');
const Trail = require('../models/trail');
const middleware = require('../middleware');
const cloudinary = require('../libs/cloudinary');

const router = express.Router();

router.get('/:userId', async (req, res) => {
  try {
    const foundUser = await User.findById(req.params.userId);

    if (!foundUser) {
      throw new Error('User not found');
    }
    const trails = await Trail.find({ 'author.id': foundUser._id });
    res.render('users/show', { foundUser, trails });
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/trails');
  }
});

router.put('/:userId', middleware.checkUserOwnership, middleware.uploadImage.single('avatar'), async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }
    user.firstName = req.body.firstName;
    user.lastName = req.body.lastName;
    user.email = req.body.email;
    user.biography = req.body.biography;

    if (req.file) {
      cloudinary.v2.uploader.destroy(user.avatarId);
      const result = await cloudinary.v2.uploader.upload(req.file.path);

      user.avatarId = result.public_id;
      user.avatar = result.secure_url;
    }

    const savedUser = await user.save();

    req.flash('success', `Saved changes to ${savedUser.username}'s profile`);
    res.redirect(`/users/${userId}`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/users/${userId}`);
  }
});

router.get('/:userId/edit', middleware.checkUserOwnership, async (req, res) => {
  try {
    const foundUser = await User.findById(req.params.userId);

    if (!foundUser) {
      throw new Error('User not found');
    }
    res.render('users/edit', { foundUser });
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/trails');
  }
});

module.exports = router;
