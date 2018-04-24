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

router.get('/', async (req, res) => {
  const { search } = req.query;
  const perPage = 8;
  const pageQuery = parseInt(req.query.page);
  const pageNumber = pageQuery ? pageQuery : 1;

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'gi');

    try {
      let noMatch = null;
      const trails = await Trail.find({ name: regex });
      if (trails.length === 0) {
        noMatch = 'No trails found. Please try again.';
      }
      res.render('trails/index', { trails, noMatch, page: 'trails' });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('back');
    }
  } else {
    try {
      const trails = await Trail.find()
        .skip(perPage * pageNumber - perPage)
        .limit(perPage)
        .exec();
      const count = await Trail.count().exec();
      const pages = Math.ceil(count / perPage);
      res.render('trails/index', { trails, current: pageNumber, pages, page: 'trails' });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('back');
    }
  }
});

router.post('/', middleware.isLoggedIn, middleware.uploadImage.single('image'), async (req, res) => {
  const { name, difficulty, estimatedTime, location, description } = req.body.trail;

  try {
    const data = await geocoder.geocode(location);

    if (!data.length) {
      throw new Error('Invalid location');
    }
    const result = await cloudinary.v2.uploader.upload(req.file.path);
    const trail = {
      name,
      difficulty,
      description,
      estimatedTime,
      author: { id: req.user._id, username: req.user.username },
      location: data[0].formattedAddress,
      lat: data[0].latitude,
      lng: data[0].longitude,
      image: result.secure_url,
      imageId: result.public_id
    };
    const newTrail = await Trail.create(trail);
    req.flash('success', newTrail.name + ' has been created!');
    res.redirect('/trails/' + newTrail._id);
  } catch (err) {
    console.log(err);
    req.flash('error', err.message);
    res.redirect('back');
  }
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
  middleware.uploadImage.single('image'),
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
        cloudinary.v2.uploader.destroy(trail.imageId);
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
