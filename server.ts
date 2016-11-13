import * as passport from 'passport';
import * as moment from 'moment';
import env from './lib/env/environment';

import mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/teamapp');
import {
  createUser,
  findUserById,
  findUserByFacebookId
} from './lib/repositories/UserRepository';
import {
  createEvent,
  findEventById,
  findUserEvents,
  participateToEvent,
  withdrawFromEvent,
  isPlayingEvent
} from './lib/repositories/EventRepository';

const FB = require('fb');
const express = require('express');
const bodyParser = require('body-parser');
const Strategy = require('passport-facebook').Strategy;
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const {ensureLoggedIn} = require('connect-ensure-login');

const hostname = env.get('hostname') || 'http://localhost:3000';
const app = express();
app.set('port', (process.env.PORT || 3000));
moment.locale('fr');

// Configure the Facebook strategy for use by Passport.
//
// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Facebook API on the user's
// behalf, along with the user's profile.  The function must invoke `cb`
// with a user object, which will be set at `req.user` in route handlers after
// authentication.
passport.use(new Strategy({
    clientID: env.get('facebook:clientId'),
    clientSecret: env.get('facebook:clientSecret'),
    callbackURL: `${hostname}/login/facebook/return`,
    profileFields: ['id', 'first_name', 'picture']
  },
  async(accessToken, refreshToken, profile, cb) => {
    let user = await findUserByFacebookId(profile.id);
    if (!user) {
      user = await createUser(profile.name.givenName, profile.id, profile.photos[0].value);
    }
    return cb(null, {id: user.id, facebookAccessToken: accessToken});
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
app.get('/login/facebook/return', passport.authenticate('facebook', {failureRedirect: '/login/facebook'}), async(req, res) => {
  if (req.session.event) {
    const event = await createEvent(
      await findUserById(req.user.id),
      req.session.event.numberOfPlayersNeeded,
      req.session.event.date,
      req.session.event.place);
    delete req.session.event;
    return res.redirect(`/events/${event.id}/share`);
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

app.get('/invite/:id', async(req, res) => {
  const event = await findEventById(req.params.id);
  const numberOfPlayersNeededPerTeam = event.numberOfPlayersNeeded / 2;
  const isConnected = !!req.user;
  if (!isConnected) {
    req.session.redirectUrl = `/invite/${event.id}`;
  }
  res.render('pages/invite', {
    organiser: event.owner,
    title: `${numberOfPlayersNeededPerTeam} vs ${numberOfPlayersNeededPerTeam}`,
    date: moment(event.date).format('LL'),
    eventId: event.id,
    isConnected,
    isPlayer: isConnected && await isPlayingEvent(event.id, req.user.id),
    isFull: event.players.length >= event.numberOfPlayersNeeded,
    numberOfSpotLeft: event.numberOfPlayersNeeded - event.players.length
  });
});

app.post('/invite/:id', async(req, res) => {
  const user = await findUserById(req.user.id);
  if (req.body.response === 'participate') {
    await participateToEvent(req.params.id, user);
  }
  if (req.body.response === 'cancel') {
    await withdrawFromEvent(req.params.id, user);
  }
  res.redirect(req.get('referer'));
});
app.post('/invite/*', ensureLoggedIn());

app.get('/', async(req, res) => res.render('pages/home', {user: !!req.user && await findUserById(req.user.id)}));
app.get('/events', async(req, res) => {
  const user = await findUserById(req.user.id);
  const events = await findUserEvents(user);
  res.render('pages/events', {
    user: user, events: events.map((event) => {
      const numberOfPlayersNeededPerTeam = event.numberOfPlayersNeeded / 2;
      return {
        id: event.id,
        title: `${numberOfPlayersNeededPerTeam} vs ${numberOfPlayersNeededPerTeam}`,
        date: moment(event.date).format('LL')
      }
    })
  })
});
app.get('/events/:id', async(req, res) => {
  const event = await findEventById(req.params.id);
  const numberOfPlayersNeededPerTeam = event.numberOfPlayersNeeded / 2;
  res.render('pages/edit', {
    eventId: event.id,
    title: `${numberOfPlayersNeededPerTeam} vs ${numberOfPlayersNeededPerTeam}`,
    date: moment(event.date).format('LL'),
    numberOfPlayers: `${event.players.length}/${event.numberOfPlayersNeeded}`,
    players: event.players
  });
});
app.get('/events/:id/share', async(req, res) => {
  const event = await findEventById(req.params.id);
  const numberOfPlayersNeededPerTeam = event.numberOfPlayersNeeded / 2;
  res.render('pages/share', {
    title: `${numberOfPlayersNeededPerTeam} vs ${numberOfPlayersNeededPerTeam}`,
    date: moment(event.date).format('LL'),
    eventId: event.id,
    link: `/invite/${event.id}`
  });
});
app.post('/events/:id/share', async(req, res) => {
  FB.setAccessToken(req.user.facebookAccessToken);
  const event = await findEventById(req.params.id);
  const post = {
    message: `J'organise un match de foot le ${moment(event.date).format('LL')} et il manque ${event.numberOfPlayersNeeded - event.players.length} joueurs. 
    J'ai créé un évènement sur teamapp. N'hésitez pas à vous inscrire!`,
    link: `${hostname}/invite/${event.id}`
  };

  function redirect() {
    res.redirect(`/events/${event.id}/share`);
  }

  FB.api('me/feed', 'post', post, res => {
    if (!res || res.error) {
      console.log(!res ? 'error occurred' : res.error);
      return;
    }
    redirect();
  });
});

app.post('/events', async(req, res) => {
  const event = await createEvent(
    await findUserById(req.user.id),
    req.body.numberOfPlayersNeeded,
    req.body.date,
    req.body.place);
  res.redirect(`/events/${event.id}/share`);
});

app.listen(app.get('port'), () => {
  console.log(`Listening on port ${app.get('port')}`);
});
