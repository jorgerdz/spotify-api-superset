async function sequence(promiseFactories) {
    let responses = [];
    for (let job of promiseFactories) {
        responses.push(await job());
    }
    return responses;
}

exports.sequence = sequence;