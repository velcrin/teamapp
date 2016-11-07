import * as passport from 'passport';
import * as moment from 'moment';

const express = require('express');
const bodyParser = require('body-parser');
const UUID = require('uuid-js');
const Strategy = require('passport-facebook').Strategy;
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const app = express();

let users = {};
moment.locale('fr');

function createUser(profile) {
  return {
    id: createUUID(),
    facebookId: profile.id,
    name: profile.name.givenName,
    avatar: profile.photos[0].value,
    events: {}
  }
}

function createUUID() {
  return UUID.create().toString();
}

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
    profileFields: ['id', 'first_name', 'picture']
  },
  function (accessToken, refreshToken, profile, cb) {
    let user = values(users).find(user => user.facebookId === profile.id);
    if (!user) {
      user = createUser(profile);
      users[user.id] = user;
    }
    return cb(null, user);
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
passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});

app.set('view engine', 'html');
app.engine('html', require('ejs').__express);
app.use(express.static(__dirname + '/public'));
app.use('/node_modules', express.static(__dirname + '/node_modules'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(expressSession({secret: 'keyboard cat', resave: true, saveUninitialized: true}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/login', (req, res) => res.render('pages/login', {user: req.user}));
app.get('/login/facebook', passport.authenticate('facebook', {scope: ['user_friends', 'email']}));
app.get('/login/facebook/return', passport.authenticate('facebook', {failureRedirect: '/login/facebook'}), (req, res) => res.redirect('/events'));
app.all('/events*', require('connect-ensure-login').ensureLoggedIn(), (req, res, next) => next());

function values(object: Object): Array<any> {
  return Object.keys(object).map((key) => object[key]);
}

app.get('/invite/:id', (req, res) => {
  const organiser = values(users).find(user => !!user.events[req.params.id]);
  const event = req.user.events[req.params.id];
  const numberOfPlayersNeededPerTeam = event.numberOfPlayersNeeded / 2;
  res.render('pages/invite', {
    organiser,
    title: `${numberOfPlayersNeededPerTeam} vs ${numberOfPlayersNeededPerTeam}`,
    date: moment(event.date).format('LL')
  });
});

app.get('/', (req, res) => res.render('pages/home', {user: req.user}));
app.get('/events', (req, res) => res.render('pages/events', {
  user: req.user, events: Object.keys(req.user.events).map((id) => {
    const match = req.user.events[id];
    const numberOfPlayersNeededPerTeam = match.numberOfPlayersNeeded / 2;
    return {
      id,
      title: `${numberOfPlayersNeededPerTeam} vs ${numberOfPlayersNeededPerTeam}`,
      date: moment(match.date).format('LL')
    }
  })
}));
app.get('/events/:id', (req, res) => {
  const event = req.user.events[req.params.id];
  const numberOfPlayersNeededPerTeam = event.numberOfPlayersNeeded / 2;
  res.render('pages/edit', {
    eventId: req.params.id,
    title: `${numberOfPlayersNeededPerTeam} vs ${numberOfPlayersNeededPerTeam}`,
    date: moment(event.date).format('LL'),
    numberOfPlayers: `${event.players.length}/${event.numberOfPlayersNeeded}`,
    players: event.players.map(userId => users[userId])
  });
});
app.get('/events/:id/share', (req, res) => {
  const event = req.user.events[req.params.id];
  const numberOfPlayersNeededPerTeam = event.numberOfPlayersNeeded / 2;
  res.render('pages/share', {
    title: `${numberOfPlayersNeededPerTeam} vs ${numberOfPlayersNeededPerTeam}`,
    date: moment(event.date).format('LL'),
    eventId: req.params.id,
    link: `/invite/${req.params.id}`
  });
});
app.post('/events', (req, res) => {
  const eventId = createUUID();
  req.user.events[eventId] = Object.assign({eventId, players: [req.user.id]}, req.body);
  users[req.user.id] = req.user;
  res.redirect(`/events/${eventId}/share`);
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});
