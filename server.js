var express = require('express');
var app = express(); 

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/home', function(req, res) {
    res.render('pages/home');
});

app.get('/profile', function(req, res) {
    res.render('pages/profile');
});

app.get('/settings', function(req, res) {
    res.render('pages/settings');
});

app.get('/edit', function(req, res) {
    res.render('pages/edit');
});

app.listen(8080); 
console.log('Server listening on port 8080');