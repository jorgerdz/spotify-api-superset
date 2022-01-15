var http = require("http");
var SpotifyWebApi = require("spotify-web-api-node");
var fs = require("fs");
var s = new SpotifyWebApi({
  clientId: "39e538b4a8ec4f5084739f1fde45b860",
  clientSecret: "c9d99ee2ad59415cab780f2a58d24fcb",
  redirectUri: "http://www.example.com/callback"
});
var token =
  "BQBwcW3FjINvgy6rwH8mx-qkWGbGb-fRF18e3YmqTSU516hD_itjr1nEYUCzsFh1U-spYUyWax0EpWjT3RzZ1K0fqcQkdp0kRBMO7toQQ8DJ_4YUUs_YdFjSEUOioJkp430RtVSDNj0cz0qT63egGDspykBNcawkmH8YuXoHw0fG8D8PUr_1wDDBXrDuIEjwa4JWtdMoQ5HYeHMZGOtJwTBH0g";

async function retrieveAllPlaylistsTracks(playlists) {
  let promiseFactories = playlists.map(getTracksBuilder);

  let responses = await sequence(promiseFactories);
  console.log("tracks obtained");
  let allTracks = responses.reduce((prev, curr) => {
    return prev.concat(curr);
  }, []);
  return allTracks;
}

async function sequence(promiseFactories) {
  let responses = [];
  for (let job of promiseFactories) {
    responses.push(await job());
  }
  return responses;
}

function getTracksBuilder(playlist) {
  return () => {
    return new Promise(function (resolve, reject) {
      console.log("getting tracks " + playlist.name);
      s.getPlaylistTracks(playlist.id)
        .then(function (result) {
          //console.log(result.body);
          resolve(
            result.body.items.map((track) => {
              track.playlist = playlist.name;
              return track;
            })
          );
        })
        .catch(reject);
    });
  };
}

function addTracksBuilder(playlist, trackUris) {
  return () => {
    return s.addTracksToPlaylist(playlist, trackUris).then(
      function (data) {
        console.log("Added tracks to playlist!");
      },
      function (err) {
        console.log("Something went wrong!", err);
      }
    );
  };
}

function split(array, chunk) {
  var i,
    j,
    results = [];
  for (i = 0, j = array.length; i < j; i += chunk) {
    results.push(array.slice(i, i + chunk));
  }
  return results;
}

function publishTracks(trackUris) {
  return new Promise(function (resolve, reject) {
    let playlist = "2I3vfsrZbwr7kg0x2p6e3t";
    let trackChunks = split(trackUris, 100);
    let addTrackBuilders = trackChunks.map(
      addTracksBuilder.bind(this, playlist)
    );
    sequence(addTrackBuilders).then(function (response) {
      resolve();
    });
  });
}

function getMatchingPlaylistByRegex(user, regex) {
  let filter = function (i) {
    return i.name.match(regex);
  };
  retrieveAllPlaylists(user)
    .then(function (playlists) {
      let filtered = playlists.filter(filter);
      //fs.writeFileSync("playlists.json", JSON.stringify(filtered));
      retrieveAllPlaylistsTracks(filtered).then((results) => {
        let trackUris = results.map((result) => result.track.uri);
        publishTracks(trackUris).then(function () {
          console.log("finished");
          let data = JSON.stringify(
            results.map((result) => {
              return {
                track: result.track.name,
                playlist: result.playlist
              };
            })
          );
          fs.writeFileSync("output.json", data);
        });
      });
    })
    .catch(function (err) {
      console.log(err);
    });
}

function retrieveAllPlaylists(user) {
  return new Promise(function (resolve, reject) {
    let promises = allPagesBuilder("getUserPlaylists");
    Promise.all(promises)
      .then(function (responses) {
        let playlists = responses
          .map((result) => result.body)
          .reduce((prev, curr) => prev.concat(curr.items), []);
        resolve(playlists);
      })
      .catch(reject);
  });
}

function allPagesBuilder(method, user) {
  var promises = [];
  var total = 832;
  for (let i = 0; i < total; i += 20) {
    let buildPromise = pageBuilder(method, user, i);
    promises.push(buildPromise);
  }
  return promises;
}

function pageBuilder(method, user, offset) {
  return s[method](user, {
    limit: 20,
    offset: offset
  });
}

http
  .createServer(function (req, res) {
    s.setAccessToken(token);
    getMatchingPlaylistByRegex("dolmenrage", /(?!Wilco).*\d+\/\d+/);
    res.write("Hello Wodlr");
    res.end();
  })
  .listen(8080);
