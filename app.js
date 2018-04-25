require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const expressSession = require('express-session');
const methodOverride = require('method-override');
const flash = require('connect-flash');

const User = require('./models/user');
const indexRoutes = require('./routes/index');
const trailRoutes = require('./routes/trails');
const commentRoutes = require('./routes/comments');
const userRoutes = require('./routes/users');

const app = express();
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/hikingtrails');

app.set('view engine', 'pug');
app.locals.moment = require('moment');

app.use(express.static(`${__dirname}/public`));
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

app.listen(port, () => {});
