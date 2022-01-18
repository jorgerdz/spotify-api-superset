let SpotifyWebApi = require("spotify-web-api-node");
const { sequence } = require("./utils");
let MAX_LIMIT = 50;

async function runner(s, method, param) {
    console.log('running')
    let promises = await allPagesBuilder(s, method, param);
    let responses = await sequence(promises)
    let items = responses
        .map((result) => result.body)
        .reduce((prev, curr) => prev.concat(curr.items), []);
    return items;
}

async function allPagesBuilder(s, method, param) {
    console.log(pageBuilder(s, method, param, 0)())
    let firstPage = await pageBuilder(s, method, param, 0)();
    console.log(firstPage)
    let promises = [() => firstPage];
    let total = firstPage.body.total;
    for (let i = 0; i < total; i += MAX_LIMIT) {
        let buildPromise = pageBuilder(s, method, param, i);
        promises.push(buildPromise);
    }
    return promises;
}

function pageBuilder(s, method, param, offset) {
    return () => {
        return s[method](param, {
            limit: MAX_LIMIT,
            offset: offset
        });
    }
}

exports.runner = runner;