async function sequence(promiseFactories) {
    let responses = [];
    for (let job of promiseFactories) {
        responses.push(await job());
    }
    return responses;
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

exports.sequence = sequence;
exports.split = split;