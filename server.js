const express = require('express');
const app = express();

app.set('view engine', 'html');
app.engine('html', require('ejs').__express);

app.use(express.static(__dirname + '/public'));
app.use('/node_modules', express.static(__dirname + '/node_modules'));

app.get('/', (req, res) => res.render('home'));
app.get('/events', (req, res) => res.render('events'));
app.get('/events/:id', (req, res) => res.render('edit', { id: req.params.id }));
app.get('/events/:id/share', (req, res) => res.render('share', { id: req.params.id }));

app.listen(3000, () => {
  console.log('Listening on port 3000');
});