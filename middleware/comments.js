const Comment = require('../models/comment');

module.exports = {
  checkCommentOwnership(req, res, next) {
    if (req.isAuthenticated()) {
      Comment.findById(req.params.commentId)
        .then(comment => {
          if (comment.author.id.equals(req.user._id) || req.user.isAdmin) {
            next();
          } else {
            req.flash('error', "You don't have permission to do that!");
            res.redirect('back');
          }
        })
        .catch(err => {
          req.flash('error', 'Comment not found!');
          res.redirect('back');
        });
    } else {
      req.flash('error', 'You need to be logged in to do that!');
      res.redirect('back');
    }
  }
};
