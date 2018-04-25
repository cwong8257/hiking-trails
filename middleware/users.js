const User = require('../models/user');

module.exports = {
  checkUserOwnership(req, res, next) {
    if (req.isAuthenticated()) {
      User.findById(req.params.userId)
        .then(user => {
          if (user._id.equals(req.user._id) || req.user.isAdmin) {
            next();
          } else {
            req.flash('error', "You don't have permission to do that!");
            res.redirect('back');
          }
        })
        .catch(err => {
          req.flash('error', 'User not found!');
          res.redirect('back');
        });
    } else {
      req.flash('error', 'You need to be logged in to do that!');
      res.redirect('back');
    }
  },
  isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash('error', 'You need to be logged in to do that!');
    return res.redirect('/login');
  },
  publicRoute(req, res, next) {
    if (!req.user) {
      return next();
    }
    return res.redirect('/trails');
  }
};
