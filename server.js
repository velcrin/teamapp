const express = require('express');
const bodyParser = require('body-parser');
const UUID = require('uuid-js');
const passport = require('passport');
const Strategy = require('passport-facebook').Strategy;
const cookieParser = require ('cookie-parser');
const morgan = require ('morgan');
const expressSession = require('express-session');
const app = express();

// Configure the Facebook strategy for use by Passport.
//
// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Facebook API on the user's
// behalf, along with the user's profile.  The function must invoke `cb`
// with a user object, which will be set at `req.user` in route handlers after
// authentication.
passport.use(new Strategy({
    clientID: '205751546505611',
    clientSecret: 'e78708edd0c07fc11dcca84010cfc433',
    callbackURL: 'http://localhost:3000/login/facebook/return',
    profileFields: ['id', 'displayName', 'email', 'picture', 'friends']
  },
  function(accessToken, refreshToken, profile, cb) {
    // In this example, the user's Facebook profile is supplied as the user
    // record.  In a production-quality application, the Facebook profile should
    // be associated with a user record in the application's database, which
    // allows for account linking and authentication with other identity
    // providers.
    return cb(null, profile);
  }));


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Twitter profile is serialized
// and deserialized.
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

app.set('view engine', 'html');
app.engine('html', require('ejs').__express);
app.use(express.static(__dirname + '/public'));
app.use('/node_modules', express.static(__dirname + '/node_modules'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(cookieParser());
app.use(expressSession({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

const events = {};

app.get('/', (req, res) => res.render('home', { user: req.user }));

app.get('/login', (req, res) => res.render('login', { user: req.user }));

app.get('/login/facebook', passport.authenticate('facebook', { scope: ['user_friends', 'email'] }));

app.get('/login/facebook/return', passport.authenticate('facebook', { failureRedirect: '/login/facebook' }), (req, res) => res.redirect('/events'));

//app.get('/events', (req, res) => res.render('events', { events }));
app.get('/events', require('connect-ensure-login').ensureLoggedIn(), (req, res) => res.render('events', { user: req.user, events }));
app.all('/events/*', require('connect-ensure-login').ensureLoggedIn(), (req, res, next) => next());
app.get('/events/:id', (req, res) => res.render('edit', { user: req.user, event: events[req.params.id] }));
app.get('/events/:id/share', (req, res) => res.render('share', { user: req.user, event: events[req.params.id] }));
app.post('/events', (req, res) => {
  const eventId = UUID.create();
  events[eventId] = Object.assign({ eventId }, req.body);
  res.redirect(`/events/${eventId}`);
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});
