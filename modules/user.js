require('dotenv').config({ path: `${__dirname}/app.env` });

const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const cookieParser = require('cookie-parser');

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(cookieParser());

const scopes = ['user-read-private', 'user-read-email', 'playlist-read-private', 'user-top-read'];
const redirectUri = process.env.REDIRECT_URI;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

const spotifyApi = new SpotifyWebApi({
  redirectUri,
  clientId,
  clientSecret,
});

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
const state = generateRandomString(16);

function login() {
  return new Promise((resolve, reject) => {
    // state = generateRandomString(16);
    // Create the authorization URL
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
    resolve(authorizeURL);
  });
}

function isLoggedIn(req, res, next) {
  if (req.cookies.access_token && req.cookies.refresh_token) {
    if (Date.now() < req.cookies.expiry_time) {
      next();
    } else {
      res.redirect('/refresh');
    }
  } else {
    res.redirect('/login');
  }
}

function refreshToken(req, res, next) {
  return new Promise((resolve, reject) => {
    createLoggedInUser(req, res).then(loggedInSpotify => {
      loggedInSpotify.refreshAccessToken().then(
        function(data) {
          console.log('The access token has been refreshed!');
          // Save the access token so that it's used in future calls
          loggedInSpotify.setAccessToken(data.body.access_token);
          resolve(data.body.access_token);
        },
        function(err) {
          console.log('Could not refresh access token', err);
          reject();
        }
      );
    });
  });
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

    // loggedInSpotify.getMe();

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

module.exports = {
  isLoggedIn,
  refreshToken,
  createLoggedInUser,
  getUserId,
  login,
  state,
  spotifyApi,
};
