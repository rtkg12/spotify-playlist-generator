require('dotenv').config({ path: `${__dirname}/app.env` });

const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const cookieParser = require('cookie-parser');

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(cookieParser());

let currentUser;

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = function(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const scopes = ['user-read-private', 'user-read-email', 'playlist-read-private'];
const redirectUri = process.env.REDIRECT_URI;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
let state;

const spotifyApi = new SpotifyWebApi({
  redirectUri,
  clientId,
  clientSecret,
});

function isLoggedIn(req, res, next) {
  if (req.cookies.access_token && req.cookies.refresh_token) {
    next();
  } else {
    res.redirect('/login');
  }
}

/**
 * Returns an instance of logged in spotify using the credentials
 * @param {*} access_token
 * @param {*} refresh_token
 */
function createLoggedInUser(req, res) {
  return new Promise((resolve, reject) => {
    let loggedInSpotify;

    loggedInSpotify = new SpotifyWebApi({
      redirectUri,
      clientId,
      clientSecret,
    });
    loggedInSpotify.setAccessToken(req.cookies.access_token);
    loggedInSpotify.setRefreshToken(req.cookies.refresh_token);

    loggedInSpotify.getMe();

    resolve(loggedInSpotify);
  });
}

function getUserId(loggedInSpotify) {
  return new Promise((resolve, reject) => {
    loggedInSpotify.getMe().then(userData => {
      resolve(userData.body.id);
    });
  });
}

app.get('/', function(req, res) {
  res.render('landing');
});

app.get('/login', function(req, res) {
  state = generateRandomString(16);
  // Create the authorization URL
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
  res.redirect(authorizeURL);
});

app.get('/callback', function(req, res) {
  // Check state in callback URL
  if (req.query.state === state) {
    // The code that's returned as a query parameter to the redirect URI
    const { code } = req.query;

    spotifyApi.authorizationCodeGrant(code).then(
      function(data) {
        console.log(`The token expires in ${data.body.expires_in}`);
        console.log(`The access token is ${data.body.access_token}`);
        console.log(`The refresh token is ${data.body.refresh_token}`);

        // Set the access token on the API object to use it in later calls
        spotifyApi.setAccessToken(data.body.access_token);
        spotifyApi.setRefreshToken(data.body.refresh_token);

        res.cookie('access_token', data.body.access_token);
        res.cookie('refresh_token', data.body.refresh_token);
        res.redirect('/test');
      },
      function(err) {}
    );
  } else {
    console.log('State error');
    res.redirect('/');
  }
});

app.get('/playlists', isLoggedIn, (req, res) => {
  res.render('playlists');
});

app.get('/test', isLoggedIn, (req, res) => {
  console.log('Reached test');
  let allPlaylists = [];

  createLoggedInUser(req).then(loggedInSpotify => {
    getUserId(loggedInSpotify).then(userData => {
      console.log(userData);
    });
    console.log('Created user data:');
    // Create the starting playlist
    loggedInSpotify.getUserPlaylists({ limit: 50 }).then(playlists => {
      console.log(playlists);
      allPlaylists = allPlaylists.concat(playlists.body.items);

      // How many calls to get all user playlists
      const numIters = Math.ceil((playlists.body.total - 50) / 50);
      const promiseArray = [];
      for (let i = 1; i <= numIters; i++) {
        const offsetVal = 50 * i + 1;
        promiseArray.push(loggedInSpotify.getUserPlaylists({ limit: 50, offset: offsetVal }));
      }

      Promise.all(promiseArray).then(allPlaylistArr => {
        // Extract the items from each call return
        allPlaylistArr = allPlaylistArr.map(x => x.body.items);

        // Concatenate all playlists
        const merged = [].concat.apply([], allPlaylistArr);
        allPlaylists = allPlaylists.concat(merged);

        const playlistNames = allPlaylists.map(x => x.name);
        console.log(playlistNames, { maxArrayLength: null });
        console.log(playlistNames.length);
      });
    });
  });
});

app.listen(3000, function() {
  console.log('Spotify playlist generator started');
});
