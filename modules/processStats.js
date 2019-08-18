const stats = require('simple-statistics');
const Playlist = require('./playlist');

function calculateStats(loggedInSpotify, playlistId) {
  return new Promise((resolve, reject) => {
    Playlist.getPlaylistTracks(loggedInSpotify, playlistId).then(tracks => {
      const promiseArray = [];

      promiseArray.push(Playlist.extractTrackFeatures(loggedInSpotify, tracks));
      promiseArray.push(Playlist.getArtistRankRecommendations(loggedInSpotify, tracks, 1));
      promiseArray.push(Playlist.getTrackRankRecommendations(loggedInSpotify, tracks, 4));

      Promise.all(promiseArray)
        .then(output => {
          const parameters = calculateFeatureParameters(output[0]);
          const seed_artists = output[1];
          const seed_tracks = output[2];

          const options = buildRecommendationOptions(parameters, seed_artists, seed_tracks);
          console.log(options);
          loggedInSpotify
            .getRecommendations(options)
            .then(recommendationList => {
              const trackList = recommendationList.body.tracks;
              console.log(trackList.map(x => x.name));
              resolve('done');
            })
            .catch(error => {
              console.log(error);
            });
        })
        .catch(error => {
          console.log(error);
        });
      // Uncomment later - commented for testing only
      // Playlist.extractTrackFeatures(loggedInSpotify, tracks).then(audioFeatures => {
      //   const parameters = calculateFeatureParameters(audioFeatures);
      //   resolve(parameters);
      // });

      // Playlist.getArtistRankRecommendations(loggedInSpotify, tracks, 2).then(artistsList => {
      //   const artistIds = artistsList;
      //   // console.log(artistIds);
      //   resolve(artistIds);
      // });

      // Playlist.getTrackRankRecommendations(loggedInSpotify, tracks, 3).then(topTracks => {
      //   console.log(topTracks);
      //   resolve(topTracks);
      // });
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
    const mean = parseFloat(stats.mean(audioFeatures[feature]).toFixed(2));
    const min = parseFloat(stats.quantile(audioFeatures[feature], 0.25).toFixed(2));
    const max = parseFloat(stats.quantile(audioFeatures[feature], 0.75).toFixed(2));
    parameters[feature] = { mean, min, max };
  });
  return parameters;
}

function getRecommendations(loggedInSpotify) {
  return new Promise((resolve, reject) => {
    loggedInSpotify.getRecommendations();
  });
}

function buildRecommendationOptions(parameters, seed_artists, seed_tracks) {
  const relevant_features = [
    'danceability',
    'energy',
    'acousticness',
    'liveness',
    'valence',
    'tempo',
    // 'popularity',
  ];

  const options = {};

  for (let i = 0; i < relevant_features.length; i++) {
    options[`min_${relevant_features[i]}`] = parameters[relevant_features[i]].min;
    options[`max_${relevant_features[i]}`] = parameters[relevant_features[i]].max;
    // options[`target_${relevant_features[i]}`] = parameters[relevant_features[i]].mean;
  }
  options.seed_artists = seed_artists;
  options.seed_tracks = seed_tracks;
  options.limit = 100;

  return options;
}

module.exports = { calculateStats };
