const express = require('express');
const mongoose = require('mongoose');

const Trail = require('../models/trail');
const middleware = require('../middleware');
const geocoder = require('../libs/geocoder');
const cloudinary = require('../libs/cloudinary');

const router = express.Router();

const escapeRegex = text => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

router.get('/', (req, res) => {
  let noMatch = null;
  const { search } = req.query;

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'gi');
    Trail.find({ name: regex })
      .then(trails => {
        if (trails.length === 0) {
          noMatch = 'No trails match that query, please try again.';
        }
        res.render('trails/index', { trails, noMatch, page: 'trails' });
      })
      .catch(err => {
        req.flash('error', err.message);
        res.redirect('back');
      });
  } else {
    Trail.find()
      .then(trails => {
        res.render('trails/index', { trails, page: 'trails' });
      })
      .catch(err => {
        req.flash('error', err.message);
        res.redirect('back');
      });
  }
});

router.post('/', middleware.isLoggedIn, middleware.uploadImage, (req, res) => {
  const author = { id: req.user._id, username: req.user.username };
  const { name, description, estimatedTime, location } = req.body.trail;

  geocoder
    .geocode(location)
    .then(
      data => {
        if (!data.length) {
          Promise.reject({ reason: 'Invalid location', redirect: 'back' });
        }
        const lat = data[0].latitude;
        const lng = data[0].longitude;
        const location = data[0].formattedAddress;

        return new Promise((resolve, reject) => {
          cloudinary.v2.uploader.upload(req.file.path, (err, result) => {
            if (err) {
              return reject(err);
            }
            const image = result.secure_url;
            const imageId = result.public_id;
            const newTrail = { name, description, estimatedTime, author, location, lat, lng, image, imageId };

            resolve(Trail.create(newTrail));
          });
        });
      },
      err => {
        req.flash('error', 'Invalid location');
        res.redirect('back');
      }
    )
    .then(
      trail => {
        req.flash('success', trail.name + ' has been created!');
        res.redirect('/trails/' + trail._id);
      },
      err => {
        req.flash('error', err.reason);
        res.redirect(err.redirect);
      }
    )
    .catch(err => {
      console.log(err);
      req.flash('error', err.message);
      res.redirect('/trails/new');
    });
});

router.get('/new', middleware.isLoggedIn, (req, res) => {
  res.render('trails/new');
});

router.get('/:trailId', middleware.validateTrailId, (req, res) => {
  const { trailId } = req.params;

  Trail.findById(trailId)
    .populate('comments')
    .exec()
    .then(trail => {
      if (!trail) {
        req.flash('error', 'Trail not found!');
        res.redirect('/trails');
      } else {
        res.render('trails/show', { trail });
      }
    })
    .catch(err => {
      req.flash('error', err.message);
      res.redirect('back');
    });
});

router.put(
  '/:trailId',
  middleware.validateTrailId,
  middleware.checkTrailOwnership,
  middleware.uploadImage,
  async (req, res) => {
    const { trailId } = req.params;

    try {
      const data = await geocoder.geocode(req.body.location);

      if (!data[0]) {
        throw new Error('Invalid location');
      }

      const trail = await Trail.findById(trailId);
      trail.lat = data[0].latitude;
      trail.lng = data[0].longitude;
      trail.location = data[0].formattedAddress;
      trail.name = req.body.trail.name;
      trail.description = req.body.trail.description;
      trail.estimatedTime = req.body.trail.estimatedTime;

      if (req.file) {
        await cloudinary.v2.uploader.destroy(trail.imageId);
        const result = await cloudinary.v2.uploader.upload(req.file.path);

        trail.imageId = result.public_id;
        trail.image = result.secure_url;
      }
      const savedTrail = await trail.save();

      req.flash('success', 'Changes saved');
      res.redirect('/trails/' + savedTrail._id);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('back');
    }
  }
);

router.delete('/:trailId', middleware.checkTrailOwnership, async (req, res) => {
  try {
    const trail = await Trail.findByIdAndRemove(req.params.trailId);
    cloudinary.v2.uploader.destroy(trail.imageId);
    req.flash('success', trail.name + ' has been deleted!');
    res.redirect('/trails');
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/trails');
  }
});

router.get('/:trailId/edit', middleware.checkTrailOwnership, (req, res) => {
  const { trailId } = req.params;

  Trail.findById(trailId)
    .then(trail => {
      res.render('trails/edit', { trail });
    })
    .catch(err => {
      req.flash('error', err.message);
      res.redirect('/trails/' + trailId);
    });
});

module.exports = router;
