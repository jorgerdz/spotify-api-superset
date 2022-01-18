let http = require("http");
let fs = require("fs");
let spotify = require('./src/spotify_wrapper');
let express = require("express");
let sequence = require("./src/utils").sequence;
let helpers = require('./src/spotify-superset')
let s;
let app = express()
let port = 80;

app.get('/', function (req, res) {
  console.log('receiving request', req.query.code)
  spotify.setCode(req.query.code);
  res.send("check your terminal")
})

app.listen(port, async () => {
    console.log(`Spotify server listening at http://localhost:${port}`)
    
    s = await spotify.getClient();
    run();
})

async function retrieveAllPlaylistsTracks(playlists) {
    let promiseFactories = playlists.map(getTracksBuilder);

    let responses = await sequence(promiseFactories);
    console.log("tracks obtained");
    let allTracks = responses.reduce((prev, curr) => {
        return prev.concat(curr);
    }, []);
    return allTracks;
}

function getTracksBuilder(playlist) {
    return () => {
        return new Promise(function (resolve, reject) {
            console.log("getting tracks " + playlist.name);
            s.getPlaylistTracks(playlist.id)
                .then(function (result) {
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


async function run() {
    s = await spotify.getClient();
    let playlists = await helpers.runner(s, 'getUserPlaylists', 'dolmenrage')
    playlists = playlists.filter((p) => p.name.match(/(?!Wilco).*\d+\/\d+/))
    let tracks;
    for (p in playlists) {
        tracks = await helpers.runner(s, 'getPlaylistTracks', playlists[p].id);
        playlists[p].tracks = tracks;
    }
    fs.writeFileSync("playlists.json", JSON.stringify(playlists));
    console.log('finished')
}
