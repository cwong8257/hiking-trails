const mongoose = require('mongoose');

const trailSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  name: String,
  estimatedTime: Number,
  image: String,
  imageId: String,
  description: String,
  location: String,
  lat: Number,
  lng: Number,
  author: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String
  },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
});

module.exports = mongoose.model('Trail', trailSchema);
