const express = require('express');
const bodyParser = require('body-parser');
const UUID = require('uuid-js');
const app = express();

app.set('view engine', 'html');
app.engine('html', require('ejs').__express);

app.use(express.static(__dirname + '/public'));
app.use('/node_modules', express.static(__dirname + '/node_modules'));
app.use(bodyParser.urlencoded({ extended: true }));

const events = {};

app.get('/', (req, res) => res.render('home'));
app.get('/events', (req, res) => res.render('events', { events }));
app.get('/events/:id', (req, res) => res.render('edit', { event: events[req.params.id] }));
app.get('/events/:id/share', (req, res) => res.render('share', { event: events[req.params.id] }));
app.post('/events', (req, res) => {
  const eventId = UUID.create();
  events[eventId] = Object.assign({ eventId }, req.body);
  res.redirect(`/events/${eventId}`);
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});