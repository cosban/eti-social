var client = require('redis').createClient(process.env.REDIS_URL || 'redis://localhost:6379'),
    friends = 'friends',
    requests = 'requests',
    requested = 'requested';

module.exports = {
    request: request,
    respondToRequest: respondToRequest,
    ofUser: ofUser
};

function get(prop, key) {
    return new Promise(function (res, rej) {
        client.hget('user:' + key, prop, function (err, result) {
            if (err) return rej(err);
            res(JSON.parse(result) || []);
        });
    });
}

function set(prop, key, value) {
    return new Promise(function (res, rej) {
        client.hset('user:' + key, prop, JSON.stringify(value), function (err, result) {
            if (err) return rej(err);
            res(result);
        });
    });
}

function add(prop, user, value) {
    return get(prop, user).then(function (list) {
        list.push(value);
        return set(prop, user, list);
    });
}
function remove(prop, user, value) {
    return get(prop, user).then(function (list) {
        var i = list.indexOf(value);
        if (i > -1) {
            list.splice(i, 1);
            return set(prop, user, list);
        }
    });
}

function request(user, newFriend) {

    return get(requested, user.name).then(function (requestedList) {
        if ((requestedList || []).indexOf(newFriend.name) === -1) {
            add(requests, newFriend.name, user.name);
            add(requested, user.name, newFriend.name);
        }
    });

}

function respondToRequest(user, newFriend, accepts) {
    remove(requests, user.name, newFriend.name);
    remove(requests, newFriend.name, user.name);
    remove(requested, user.name, newFriend.name);
    var result = remove(requested, newFriend.name, user.name);

    if (accepts) {
        add(friends, user.name, newFriend.name);
        result = add(friends, newFriend.name, user.name);
    }

    return result; // for chaining;
}

function ofUser(user) {
    return new Promise(function (res, rej) {
        var friendship = {};

        get(friends, user.name).then(function (list) {
            friendship.friends = (list || []).map(toUser);
            resolve();
        }, rej);
        get(requests, user.name).then(function (list) {
            friendship.requests = (list || []).map(toUser);
            resolve();
        }, rej);
        get(requested, user.name).then(function (list) {
            friendship.requested = (list || []).map(toUser);
            resolve();
        }, rej);

        var waiting = 3;
        function resolve() {
            waiting--;
            if (!waiting) {
                res(friendship);
            }
        }
    })
}

function toUser(name) {
    return {
        name: name
    };
}