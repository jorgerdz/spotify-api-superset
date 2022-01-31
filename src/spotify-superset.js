const { sequence } = require("./utils");
const { split } = require("./utils");
let s = require('./spotify_wrapper').client;
let MAX_LIMIT_PAGINATE = 50;
let MAX_LIMIT_POST = 100;


async function runner(method, param) {
    let promises = await allPagesBuilder(method, param);
    let responses = await sequence(promises)
    let items = responses
        .map((result) => result.body)
        .reduce((prev, curr) => prev.concat(curr.items), []);
    return items;
}

async function allPagesBuilder(method, params) {
    let firstPage = await builder(method, params, {limit: MAX_LIMIT_PAGINATE, offset: 0})();
    let promises = [() => firstPage];
    let total = firstPage.body.total;
    for (let i = MAX_LIMIT_PAGINATE; i < total; i += MAX_LIMIT_PAGINATE) {
        let buildPromise = builder(method, params, {limit: MAX_LIMIT_PAGINATE, offset: i});
        promises.push(buildPromise);
    }
    return promises;
}

function builder(method, params, config = {}) {
    return () => {
        console.log(method, params, config)
        return s[method](...params, config);
    }
}


// Takes a long list, breaks it into chunks and runs each in sequence
async function bulkRunner(method, target, items) {
    let itemChunks = split(items, MAX_LIMIT_POST);
    let builders = itemChunks.map(i => {
        return builder(method, [target, i])
    })
    let responses = await sequence(builders);
}

exports.runner = runner;
exports.bulkRunner = bulkRunner;