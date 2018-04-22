const express = require('express');
const passport = require('passport');

const User = require('../models/user');
const Trail = require('../models/trail');
const middleware = require('../middleware');

const router = express.Router();

router.get('/:userId', (req, res) => {
  User.findById(req.params.userId)
    .then(foundUser => {
      Trail.find({ 'author.id': foundUser._id }).then(trails => {
        res.render('users/show', { foundUser, trails });
      });
    })
    .catch(err => {
      req.flash('error', err.message);
      res.redirect('/trails');
    });
});

router.put('/:userId', middleware.checkUserOwnership, (req, res) => {
  const { userId } = req.params;

  User.findByIdAndUpdate(userId, req.body.user)
    .then(user => {
      req.flash('success', `Saved changes to ${user.username}'s profile`);
      res.redirect(`/users/${userId}`);
    })
    .catch(err => {
      req.flash('error', err.message);
      res.redirect(`/users/${userId}`);
    });
});

router.get('/:userId/edit', middleware.checkUserOwnership, (req, res) => {
  User.findById(req.params.userId)
    .then(foundUser => {
      res.render('users/edit', { foundUser });
    })
    .catch(err => {
      req.flash('error', err.message);
      res.redirect('/trails');
    });
});

module.exports = router;
