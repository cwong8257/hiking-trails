const mongoose = require('mongoose');

const trailMiddleware = require('./trails');
const commentMiddleware = require('./comments');
const userMiddleware = require('./users');
const multerMiddleware = require('./multer');

module.exports = Object.assign(trailMiddleware, commentMiddleware, userMiddleware, multerMiddleware);
