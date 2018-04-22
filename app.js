require('dotenv').config();

const express = require('express'),
  bodyParser = require('body-parser'),
  mongoose = require('mongoose'),
  passport = require('passport'),
  LocalStrategy = require('passport-local'),
  expressSession = require('express-session'),
  methodOverride = require('method-override'),
  flash = require('connect-flash');

const Trail = require('./models/trail'),
  User = require('./models/user'),
  Comment = require('./models/comment'),
  indexRoutes = require('./routes/index'),
  trailRoutes = require('./routes/trails'),
  commentRoutes = require('./routes/comments'),
  userRoutes = require('./routes/users');

const app = express();

mongoose.connect('mongodb://localhost/hikingtrails');

app.set('view engine', 'pug');
app.locals.moment = require('moment');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(expressSession({ secret: 'Once again Rust wins cutest dog!', resave: false, saveUninitialized: false }));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});
app.use('/', indexRoutes);
app.use('/users', userRoutes);
app.use('/trails', trailRoutes);
app.use('/trails/:trailId/comments', commentRoutes);

app.listen(3000, () => {
  console.log('Server is running!');
});
