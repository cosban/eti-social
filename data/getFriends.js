var client = require('redis').createClient(process.env.REDIS_URL || 'redis://localhost:6379');

module.exports = function (user) {
    return new Promise(function (res, rej) {
        client.lrange(user.name + '-friends', 0, -1, function (err, result) {
            if(err) return rej(err);

            console.log('friends of ' + user.name, result);
            res(result);
        });
    })
};