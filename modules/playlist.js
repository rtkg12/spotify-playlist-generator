const user = require('./user');

function loadPlaylists(req) {
  return new Promise((resolve, reject) => {
    let allPlaylists = [];

    user.createLoggedInUser(req).then(loggedInSpotify => {
      // getUserId(loggedInSpotify).then(userData => {
      //   console.log(userData);
      // });
      console.log('Created user data:');
      // Create the starting playlist
      loggedInSpotify.getUserPlaylists({ limit: 50 }).then(playlists => {
        // console.log(playlists);
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

          // const playlistNames = allPlaylists.map(x => x.name);
          extractDataPlaylists(allPlaylists).then(allPlaylistData => {
            resolve(allPlaylistData);
          });
          // console.log(playlistNames, { maxArrayLength: null });
          // console.log(playlistNames.length);
        });
      });
    });
  });
}

function extractDataPlaylists(playlists) {
  return new Promise((resolve, reject) => {
    const extractedData = []; // Array of playlist names and images
    playlists.forEach(playlist => {
      const imageData = playlist.images[0];
      if (imageData) {
        extractedData.push({
          name: playlist.name,
          image: imageData.url,
        });
      } else {
        extractedData.push({
          name: playlist.name,
          image:
            'https://c7.uihere.com/files/339/880/951/computer-icons-playlist-youtube-music-youtube-thumb.jpg',
        });
      }
    });
    console.log(extractedData);
    resolve(extractedData);
  });
  // return new Promise((resolve, reject)=>{
  //   playlists.forEach((playlist)=>{
  //     console.log(playlist.name);
  //     resolve("Hello");
  //   }
  // })
}

function getPlaylistTracks(loggedInSpotify, playlistId) {
  return new Promise((resolve, reject) => {
    let allPlaylistTracks = [];
    // Can replace initial call with getPlaylist to get more details about the playlist
    loggedInSpotify.getPlaylistTracks(playlistId).then(tracks => {
      allPlaylistTracks = allPlaylistTracks.concat(tracks.body.items);

      console.log('Total tracks: ', tracks.body.total);

      // How many calls to get all tracks
      const numIters = Math.ceil((tracks.body.total - 100) / 100);
      const promiseArray = [];
      for (let i = 1; i <= numIters; i++) {
        const offsetVal = 100 * i + 1;
        promiseArray.push(loggedInSpotify.getPlaylistTracks(playlistId, { offset: offsetVal }));
      }

      Promise.all(promiseArray).then(allTracksArr => {
        // Extract the items from each call return
        allTracksArr = allTracksArr.map(x => x.body.items);

        // Concatenate all playlists
        const merged = [].concat.apply([], allTracksArr);
        allPlaylistTracks = allPlaylistTracks.concat(merged);

        console.log('Number of tracks in built list: ', allPlaylistTracks.length);
        resolve(allPlaylistTracks);
      });
    });
  });
}

function extractTrackFeatures(loggedInSpotify, tracks) {
  return new Promise((resolve, reject) => {
    const trackIds = tracks.map(x => x.track.id);
    const popularity = tracks.map(x => x.track.popularity);

    // Split the array of ids into chunks of 100 to make API calls
    const splitTracks = splitArrIntoChunks(trackIds, 100);

    const promiseArray = [];
    for (let i = 0; i < splitTracks.length; i++) {
      promiseArray.push(loggedInSpotify.getAudioFeaturesForTracks(splitTracks[i]));
    }

    Promise.all(promiseArray).then(allTrackFeatures => {
      // Extract the items from each call return
      allTrackFeatures = allTrackFeatures.map(x => x.body.audio_features);

      // Concatenate all track info
      const merged = [].concat.apply([], allTrackFeatures);

      const audioFeatures = buildTrackData(merged, popularity);
      resolve(audioFeatures);
    });
  });
}

function splitArrIntoChunks(array, chunkSize) {
  const splitArray = [];
  for (let i = 0, len = array.length; i < len; i += chunkSize)
    splitArray.push(array.slice(i, i + chunkSize));
  return splitArray;
}

function buildTrackData(trackData, popularity) {
  const danceability = trackData.map(x => x.danceability);
  const energy = trackData.map(x => x.energy);
  const key = trackData.map(x => x.key);
  const loudness = trackData.map(x => x.loudness);
  const mode = trackData.map(x => x.mode);
  const speechiness = trackData.map(x => x.speechiness);
  const acousticness = trackData.map(x => x.acousticness);
  const instrumentalness = trackData.map(x => x.instrumentalness);
  const liveness = trackData.map(x => x.liveness);
  const valence = trackData.map(x => x.valence);
  const tempo = trackData.map(x => x.tempo);

  return {
    danceability,
    energy,
    key,
    loudness,
    mode,
    speechiness,
    acousticness,
    instrumentalness,
    liveness,
    valence,
    tempo,
    popularity,
  };
}

module.exports = { loadPlaylists, getPlaylistTracks, extractTrackFeatures };
