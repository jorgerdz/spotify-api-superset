let SpotifyWebApi = require("spotify-web-api-node");
let fs = require("fs");
let open = require("open");
let options = {
    clientId: "39e538b4a8ec4f5084739f1fde45b860",
    clientSecret: "c9d99ee2ad59415cab780f2a58d24fcb",
    // this needs to be configured to work on local
    redirectUri: "http://spotify-wrapper.com"
}
const SCOPES = ['playlist-read-private', 'user-library-modify', 'playlist-modify-private', 'playlist-modify-public']
let spotify = new SpotifyWebApi(options);
let promiseResolve, promiseReject;
let authPromise = new Promise(function(resolve, reject){
  promiseResolve = resolve;
  promiseReject = reject;
});

async function setCode(code) {
    let data = await spotify.authorizationCodeGrant(code)
    setToken(data.body.access_token)
}

function setToken(token) {
    spotify.setAccessToken(token);
    fs.writeFileSync("token", token);
    promiseResolve();
}

function getStoredToken() {
    try {
        let storedToken = fs.readFileSync('token')
        return storedToken;
    } catch {
        return;
    }
}

async function getClient() {
    let token = getStoredToken();
    if (token) {
        setToken(token);
    } else {
        requestToken();
    }
    await authPromise;
    return spotify;
}

function requestToken() {
    let authorizeURL = spotify.createAuthorizeURL(SCOPES, 'authorizing');
    open(authorizeURL);
    return;
}

exports.getClient = getClient;
exports.setCode = setCode;
exports.client = spotify;
