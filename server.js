const express = require('express');
const app = express();

app.set('view engine', 'html');
app.engine('html', require('ejs').__express);

app.use(express.static(__dirname + '/public'));
app.use('/node_modules', express.static(__dirname + '/node_modules'));

app.get('/', (req, res) => res.render('home'));

app.listen(3000, () => {
  console.log('Listening on port 3000');
});