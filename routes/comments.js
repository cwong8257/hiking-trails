const express = require('express');

const Trail = require('../models/trail');
const Comment = require('../models/comment');
const middleware = require('../middleware');

const router = express.Router({ mergeParams: true });

router.get('/new', middleware.isLoggedIn, (req, res) => {
  Trail.findById(req.params.trailId)
    .then(trail => res.render('comments/new', { trail }))
    .catch(err => {
      req.flash('error', err.message);
      res.redirect('/trails');
    });
});

router.post('/', middleware.isLoggedIn, (req, res) => {
  const { trailId } = req.params;

  Trail.findById(trailId)
    .then(trail => {
      const newComment = req.body.comment;
      newComment.author = {
        id: req.user._id,
        username: req.user.username
      };

      return Comment.create(newComment).then(comment => {
        trail.comments.push(comment._id);
        return trail.save();
      });
    })
    .then(trail => {
      req.flash('success', 'Comment added!');
      res.redirect(`/trails/${trailId}`);
    })
    .catch(err => {
      req.flash('error', err.message);
      res.redirect(`/trails/${trailId}`);
    });
});

router.get('/:commentId/edit', middleware.validateTrailId, middleware.checkCommentOwnership, (req, res) => {
  const { trailId, commentId } = req.params;

  Trail.findById(trailId).then(trail => {
    if (trail) {
      Comment.findById(commentId)
        .then(comment => {
          res.render('comments/edit', { comment, trailId });
        })
        .catch(err => {
          req.flash('error', err.message);
          res.redirect(`/trails/${trailId}`);
        });
    } else {
      req.flash('error', 'Trail does not exist');
      res.redirect('/trails');
    }
  });
});

router.put('/:commentId', middleware.validateTrailId, middleware.checkCommentOwnership, (req, res) => {
  const { trailId, commentId } = req.params;

  Comment.findByIdAndUpdate(commentId, req.body.comment)
    .then(comment => {
      req.flash('success', 'Changes saved');
      res.redirect(`/trails/${trailId}`);
    })
    .catch(err => {
      res.redirect(`/trails/${trailId}`);
    });
});

router.delete('/:commentId', middleware.validateTrailId, middleware.checkCommentOwnership, (req, res) => {
  const { trailId, commentId } = req.params;

  Comment.findByIdAndRemove(commentId)
    .then(() => {
      req.flash('success', 'Comment deleted!');
      res.redirect(`/trails/${trailId}`);
    })
    .catch(err => {
      req.flash('error', err.message);
      res.redirect('/trails');
    });
});

module.exports = router;
