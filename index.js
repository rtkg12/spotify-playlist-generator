require('dotenv').config({ path: `${__dirname}/app.env` });

const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const cookieParser = require('cookie-parser');
const user = require('./modules/user');
const playlist = require('./modules/playlist');
const stats = require('./modules/processStats');

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(cookieParser());

app.get('/', function(req, res) {
  res.render('landing');
});

app.get('/login', function(req, res) {
  user.login().then(authorizeURL => {
    res.redirect(authorizeURL);
  });
});

app.get('/callback', function(req, res) {
  // Check state in callback URL
  if (req.query.state === user.state) {
    // The code that's returned as a query parameter to the redirect URI
    const { code } = req.query;

    user.spotifyApi.authorizationCodeGrant(code).then(
      function(data) {
        console.log(`The token expires in ${data.body.expires_in}`);
        console.log(`The access token is ${data.body.access_token}`);
        console.log(`The refresh token is ${data.body.refresh_token}`);

        // Set the access token on the API object to use it in later calls
        user.spotifyApi.setAccessToken(data.body.access_token);
        user.spotifyApi.setRefreshToken(data.body.refresh_token);

        res.cookie('access_token', data.body.access_token);
        res.cookie('refresh_token', data.body.refresh_token);
        res.redirect('/test');
      },
      function(err) {}
    );
  } else {
    console.log('State error');
    console.log(req.query.state);
    console.log(user.state);
    res.redirect('/');
  }
});

app.get('/playlists', user.isLoggedIn, (req, res) => {
  res.render('playlists');
  playlist.loadPlaylists(req).then(allUserPlaylists => {
    res.render('playlists', { playlists: allUserPlaylists });
    // console.log(playlistNames, { maxArrayLength: null });
    // console.log(playlistNames.length);
  });
});

app.get('/test', user.isLoggedIn, (req, res) => {
  console.log('Reached test');
  const playlistId = '4RgjKurQCKmKkyWCYtT3tQ';
  user.createLoggedInUser(req, res).then(loggedInSpotify => {
    stats.calculateStats(loggedInSpotify, playlistId).then(results => {});
  });
});

app.get('/test2', (req, res) => {
  stats.test();
});

app.listen(3000, function() {
  console.log('Spotify playlist generator started');
});
