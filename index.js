var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    portNumber = process.env.PORT || 3000,
    util = require('./helpers/util'),
    validate = require('./helpers/validate'),
    Friendships = require('./data/Friendships');

var activeUsers = [], connections = [];

function connect(username, clientIp) {
    return validate.etiLogin(username, clientIp).then(function () {
        var user = activeUsers.propFilter('name', username)[0];
        if (!user) {
            user = {
                name: username,
                topics: [],
                joining: true
            };
            activeUsers.push(user);
        }
        return user;
    }, function (err) {
        console.log(err, username);
    });
}

function emit(user, action, topic) {
    forEach(connections.propFilter('topicId', topic.id), function (socket) {
        socket.emit(action, socket.serializeUsers(user));
    });
}

io.on('connection', function (socket) {
    var clientIp = socket.handshake.headers['x-forwarded-for'];
    var topicId = parseInt(socket.handshake.headers.referer.match(/topic=(\d+)/i)[1]);
    var page = parseInt(socket.handshake.headers.referer.match(/page=(\d+)/i)[1] || 1);
    var username = socket.handshake.query.user;

    console.log('[' + (new Date()) + '] tid=' + topicId);

    connect(username, clientIp).then(function (user) {
        var topic = user.topics.propFilter('id', topicId)[0];
        if (!topic) {
            topic = {id: topicId, page: page};
            emit(user, 'joined', topic);
        }

        socket.on('friendRequest', friendRequest);
        socket.on('respondToRequest', respondToRequest);
        socket.on('disconnect', disconnect);

        Friendships.ofUser(user).then(initialize).then(function (friendships) {
            socket.emit('users', friendships);
        });

        function initialize(friendships) {
            var usersInTopic, activeFriends;

            connections.push(socket);
            user.topics.push(topic);
            socket.join(topicId);
            socket.topicId = topicId;
            socket.etiUser = user;
            socket.friendships = friendships;
            socket.serializeUsers = serializeUsers;

            function serializeUsers(users) {
                if (users instanceof Array) {
                    return users.map(serializeUsers);
                }
                else {
                    var usr = users;
                    var friend = !!friendships.friends.findUser(usr);
                    var pending = !friend && (friendships.requests.findUser(usr) || friendships.requested.findUser(usr));

                    return {
                        name: usr.name,
                        friend: friend,
                        pending: pending
                    };
                }
            }

            if (user.joining) {
                delete user.joining;

                connections.withUsers(friendships.friends).forEach(function (sock) {
                    sock.emit('friendJoined', user);
                });
            }

            usersInTopic = activeUsers
                .inTopic(topic)
                .filter(function (activeUser) {
                    return activeUser.name !== user.name;
                });

            activeFriends = activeUsers
                .filter(function (activeUser) {
                    return friendships.friends.filter(function (friend) {
                        return friend.name === activeUser.name
                    })[0];
                });

            return {
                inTopic: serializeUsers(usersInTopic),
                friends: activeFriends,
                requests: serializeUsers(friendships.requests),
                requested: serializeUsers(friendships.requested)
            };
        }

        function friendRequest(newFriend) {
            Friendships.request(user, newFriend).then(function () {
                connections.findUser(newFriend).forEach(function (sock) {
                    sock.emit('friendRequest', user);
                });
            });
        }

        function respondToRequest(newFriend, accepted) {
            Friendships.respondToRequest(user, newFriend, accepted).then(function () {
                if (accepted) {
                    var notifiedSelf = false;

                    connections.findUser(newFriend).forEach(function (sock) {
                        sock.emit('friendJoined', user);

                        if (!notifiedSelf) { // notify responder that her new friend is online
                            connections.findUser(user).forEach(function (responder) {
                                responder.emit('friendJoined', newFriend);
                            });
                            notifiedSelf = true;
                        }
                    });
                }
            });
        }

        function disconnect() {
            connections.remove(socket);
            user.topics.remove(topic);

            if (user.topics.propFilter('id', topic.id).length === 0) {
                emit(user, 'left', topic);
            }

            if (!user.topics.length) {
                activeUsers.remove(user);

                Friendships.ofUser(user).then(function (friendships) {
                    connections.withUsers(friendships.friends).forEach(function (sock) {
                        sock.emit('friendLeft', user);
                    });
                });
            }
        }
    });
});

http.listen(portNumber, function () {
    console.log('listening on *:' + portNumber);
});

app.use(express.static('./public'));