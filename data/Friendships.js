var client = require('redis').createClient(process.env.REDIS_URL || 'redis://localhost:6379');

module.exports = {
    request: request,
    respondToRequest: respondToRequest,
    ofUser: ofUser
};

function request (user, newFriend) {
    console.log(user.name, 'requested friendship with', newFriend.name);
    client.lrange(newFriend.name + '-requests', 0, -1, function (err, requests) {
        if(requests.indexOf(user.name) === -1) {
            client.lrange(user.name + '-requests', 0, -1, function (err, reqs) {
                if(reqs.indexOf(newFriend.name) > -1) {
                    // both have requested each other
                    respondToRequest(user, newFriend, true);
                }
                else {
                    client.lpush(newFriend.name + '-requests', user.name);
                    client.lpush(user.name + '-requested', newFriend.name);
                }
            });
        }
    });
}

function respondToRequest (user, newFriend, accepts) {
    console.log(user.name, accepts ? 'accepted' : 'rejected'  + ' friendship with', newFriend.name);

    // remove all requests from both sides
    client.lrem(user.name + '-requests', -1, newFriend.name);
    client.lrem(newFriend.name + '-requests', -1, user.name);
    client.lrem(user.name + '-requested', -1, newFriend.name);
    client.lrem(newFriend.name + '-requested', -1, user.name);

    if(accepts) {
        client.lpush(user.name + '-friends', newFriend.name);
        client.lpush(newFriend.name + '-friends', user.name);
    }
}

function ofUser (user) {
    return new Promise(function (res, rej) {
        var friends, requests, requested;

        client.lrange(user.name + '-friends', 0, -1, function (err, result) {
            if(err) return rej(err);
            console.log('friends of ' + user.name, result.map(toUser));
            friends = result.map(toUser);
            resolve();
        });
        client.lrange(user.name + '-requests', 0, -1, function (err, result) {
            if(err) return rej(err);
            console.log('requests for ' + user.name, result.map(toUser));
            requests = result.map(toUser);
            resolve();
        });
        client.lrange(user.name + '-requested', 0, -1, function (err, result) {
            if(err) return rej(err);
            console.log('requests from ' + user.name, result.map(toUser));
            requested = result.map(toUser);
            resolve();
        });

        function resolve() {
            if(friends && requests && requested) {
                res({
                    friends: friends,
                    requests: requests,
                    requested: requested
                });
            }
        }
    })
}

function toUser (name) {
    return {
        name: name
    };
}