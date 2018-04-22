const mongoose = require('mongoose');

const Trail = require('../models/trail');

module.exports = {
  validateTrailId(req, res, next) {
    const { trailId } = req.params;
    if (mongoose.Types.ObjectId.isValid(trailId)) {
      next();
    } else {
      req.flash('error', 'Trail not found!');
      res.redirect('/trails');
    }
  },
  checkTrailOwnership(req, res, next) {
    if (req.isAuthenticated()) {
      Trail.findById(req.params.trailId)
        .then(trail => {
          if (trail.author.id.equals(req.user._id) || req.user.isAdmin) {
            next();
          } else {
            req.flash('error', "You don't have permission to do that!");
            res.redirect('/trails');
          }
        })
        .catch(err => {
          req.flash('error', 'Trail not found!');
          res.redirect('/trails');
        });
    } else {
      req.flash('error', 'You need to be logged in to do that!');
      res.redirect('/login/');
    }
  }
};
