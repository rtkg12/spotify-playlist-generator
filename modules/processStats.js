const stats = require('simple-statistics');
const Playlist = require('./playlist');

function calculateStats(loggedInSpotify, playlistId) {
  return new Promise((resolve, reject) => {
    Playlist.getPlaylistTracks(loggedInSpotify, playlistId).then(tracks => {
      Playlist.extractTrackFeatures(loggedInSpotify, tracks).then(audioFeatures => {
        const parameters = calculateFeatureParameters(audioFeatures);
        resolve(parameters);
      });
    });
  });
}

function calculateFeatureParameters(audioFeatures) {
  const parameters = {};

  // List of audio features
  const features = [
    'danceability',
    'energy',
    'key',
    'loudness',
    'mode',
    'speechiness',
    'acousticness',
    'instrumentalness',
    'liveness',
    'valence',
    'tempo',
    'popularity',
  ];

  features.forEach(feature => {
    const mean = stats.mean(audioFeatures[feature]);
    const min = stats.quantile(audioFeatures[feature], 0.25);
    const max = stats.quantile(audioFeatures[feature], 0.75);
    parameters[feature] = { mean, min, max };
  });

  return parameters;
}

module.exports = { calculateStats };
