const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  text: String,
  author: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String
  }
});

module.exports = mongoose.model('Comment', commentSchema);
