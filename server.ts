import * as passport from 'passport';
import * as moment from 'moment';
import {without} from 'lodash';

const FB = require('fb');
const express = require('express');
const bodyParser = require('body-parser');
const UUID = require('uuid-js');
const Strategy = require('passport-facebook').Strategy;
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const {ensureLoggedIn} = require('connect-ensure-login');

const HOSTNAME = process.env.HOSTNAME || 'http://localhost:3000/';
const app = express();
app.set('port', (process.env.PORT || 3000));
const users = {};
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
    callbackURL: `${HOSTNAME}login/facebook/return`,
    profileFields: ['id', 'first_name', 'picture']
  },
  function (accessToken, refreshToken, profile, cb) {
    let user = values(users).find(user => user.facebookId === profile.id);
    if (!user) {
      user = createUser(profile);
      users[user.id] = user;
    }
    user.facebookAccessToken = accessToken;
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

app.get('/login', (req, res) => res.render('pages/login'));
app.get('/login/facebook', passport.authenticate('facebook', {scope: ['publish_actions']}));
app.get('/login/facebook/return', passport.authenticate('facebook', {failureRedirect: '/login/facebook'}), (req, res) => {
  if (req.session.event) {
    const eventId = createEvent(req.user, req.session.event);
    delete req.session.event;
    return res.redirect(`/events/${eventId}/share`);
  }
  if (req.session.redirectUrl) {
    res.redirect(req.session.redirectUrl);
    delete req.session.redirectUrl;
    return;
  }
  res.redirect('/events');
});
app.get('/events*', ensureLoggedIn());
app.post('/events', (req, res, next) => {
  if (isEvent(req.body)) {
    req.session.event = req.body;
  }
  return ensureLoggedIn()(req, res, next);
});

function isEvent(object) {
  return JSON.stringify(Object.keys(object)) === JSON.stringify(['date', 'numberOfPlayersNeeded', 'place']);
}

function values(object: Object): Array<any> {
  return Object.keys(object).map((key) => object[key]);
}

app.get('/invite/:id', (req, res) => {
  const organiser = values(users).find(user => !!user.events[req.params.id]);
  const event = findEvent(req.params.id);
  const numberOfPlayersNeededPerTeam = event.numberOfPlayersNeeded / 2;
  const isConnected = req.user;
  if (!isConnected) {
    req.session.redirectUrl = `/invite/${req.params.id}`;
  }
  res.render('pages/invite', {
    organiser,
    title: `${numberOfPlayersNeededPerTeam} vs ${numberOfPlayersNeededPerTeam}`,
    date: moment(event.date).format('LL'),
    eventId: req.params.id,
    isConnected,
    isPlayer: isConnected && event.players.indexOf(req.user.id) >= 0,
    isFull: event.players.length >= event.numberOfPlayersNeeded,
    numberOfSpotLeft: event.numberOfPlayersNeeded - event.players.length
  });
});

function findEvent(eventId) {
  const events = [].concat(...values(users).map(user => values(user.events)));
  return events.find(event => event.eventId === eventId);
}

function participate(eventId, userId) {
  const event = findEvent(eventId);
  event.players = [...event.players, userId];
}

function cancelParticipation(eventId, userId) {
  const event = findEvent(eventId);
  event.players = without(event.players, userId);
}

app.post('/invite/:id', (req, res) => {
  if (req.body.response === 'participate') {
    participate(req.params.id, req.user.id);
  }
  if (req.body.response === 'cancel') {
    cancelParticipation(req.params.id, req.user.id);
  }
  res.redirect(req.get('referer'));
});
app.post('/invite/*', ensureLoggedIn());

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
  const event = findEvent(req.params.id);
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
app.post('/events/:id/share', (req, res) => {
  FB.setAccessToken(users[req.user.id].facebookAccessToken);
  const event = findEvent(req.params.id);
  const post = {
    message: `J'organise un match de foot le ${moment(event.date).format('LL')} et il manque ${event.numberOfPlayersNeeded - event.players.length} joueurs. 
    J'ai créé un évenement sur teamapp. N'hésitez pas à vous inscrire!`,
    link: `${HOSTNAME}/invite/${event.eventId}`
  };

  function redirect() {
    res.redirect(`/events/${event.eventId}/share`);
  }

  FB.api('me/feed', 'post', post, res => {
    if (!res || res.error) {
      console.log(!res ? 'error occurred' : res.error);
      return;
    }
    redirect();
  });
});

app.post('/events', (req, res) => {
  const eventId = createEvent(req.user, req.body);
  res.redirect(`/events/${eventId}/share`);
});

function createEvent(user, event) {
  const eventId = createUUID();
  user.events[eventId] = Object.assign({eventId, players: [user.id]}, event);
  users[user.id] = user;
  return eventId;
}

app.listen(app.get('port'), () => {
  console.log(`Listening on port ${app.get('port')}`);
});
