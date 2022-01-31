let fs = require("fs");
let spotify = require('./src/spotify_wrapper');
let express = require("express");
let helpers = require('./src/spotify-superset')
let app = express()
let port = 80;

app.get('/', function (req, res) {
  spotify.setCode(req.query.code);
  res.send("check your terminal")
})

app.listen(port, async () => {
    console.log(`Spotify server listening at http://localhost:${port}`)
    run();
})

async function run() {
    await spotify.getClient();
    console.log('getting playlists')
    let playlists = await helpers.runner('getUserPlaylists', ['dolmenrage'])
    let pid = playlists.map(p => p.name)
    console.log(pid)
    console.log('filtering playlists')
    playlists = playlists.filter((p) => p.name.match(/(?!Wilco).*\d+\/\d+/))
    let tracks;
    let allTracks = [];
    console.log('getting tracks')
    for (p in playlists) {
        let tracks = await helpers.runner('getPlaylistTracks', [playlists[p].id]);
        tracks.map(t => {
            delete t.track.available_markets;
            delete t.track.album.available_markets;
        })
        playlists[p].tracks = tracks;
        console.log(allTracks.length, tracks.length)
        allTracks = [...allTracks, ...tracks];
        console.log(allTracks.length, tracks.length)
    }
    fs.writeFileSync("playlists.json", JSON.stringify(playlists));
    fs.writeFileSync("tracks.json", JSON.stringify(allTracks));
    console.log('publishing tracks')
    let trackUris = allTracks.map(result => result.track.uri).filter(t => t.indexOf('spotify:local') === -1);
    await helpers.bulkRunner('addTracksToPlaylist', '2I3vfsrZbwr7kg0x2p6e3t', trackUris)

    console.log('finished')
}
