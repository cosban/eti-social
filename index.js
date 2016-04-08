var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    portNumber = process.env.PORT || 3000,
    util = require('./helpers/util'),
    validate = require('./helpers/validate'),
    Friendships = require('./data/Friendships');

var activeUsers = [], connections = [];

function connect(topicData, clientIp) {
    var username = topicData.user.name;

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
    io.in(topic.id).emit(action, {name: user.name});
}

io.on('connection', function (socket) {
    var clientIp = socket.handshake.headers['x-forwarded-for'];

    socket.on('topic', function (topicData) {
        connect(topicData, clientIp).then(function (user) {
            socket.etiUser = user;
            connections.push(socket);

            var topic = user.topics.propFilter('id', topicData.id)[0];

            if (!topic) {
                topic = {id: topicData.id};
                emit(user, 'joined', topic);
            }

            user.topics.push(topic);

            socket.join(topic.id);

            socket.on('friendRequest', function (newFriend) {
                Friendships.request(user, newFriend).then(function () {
                    connections.findUser(newFriend).forEach(function (sock) {
                        sock.emit('friendRequest', user);
                    });
                });
            });
            socket.on('respondToRequest', function (newFriend, accepted) {
                Friendships.respondToRequest(user, newFriend, accepted).then(function () {
                    if(accepted) {
                        connections.findUser(newFriend).forEach(function (sock) {
                            sock.emit('friendJoined', user);

                            connections.findUser(user).forEach(function (responder) {
                                responder.emit('friendJoined', newFriend);
                            });
                        });
                    }
                });
            });
            socket.on('disconnect', leaveTopic);

            Friendships.ofUser(user).then(function (friendships) {
                var friends = friendships.friends.map(function (user) {
                    return user.name;
                });
                var requested = friendships.requested.map(function (user) {
                    return user.name;
                });

                if (user.joining) {
                    delete user.joining;

                    connections.withUsers(friendships.friends).forEach(function (sock) {
                        sock.emit('friendJoined', user);
                    });
                }

                var usersInTopic = activeUsers
                    .inTopic(topic)
                    .filter(function (activeUser) {
                        return activeUser.name !== user.name;
                    })
                    .map(function (user) {
                        return {
                            name: user.name,
                            friend: friends.indexOf(user.name) > -1,
                            pending: requested.indexOf(user.name) > -1
                        }
                    });

                var activeFriends = activeUsers.filter(function (activeUser) {
                    return friends.indexOf(activeUser.name) > -1;
                }).map(function (user) {
                    return {
                        name: user.name
                    }
                });

                socket.emit('users', {
                    inTopic: usersInTopic,
                    friends: activeFriends,
                    requests: friendships.requests,
                    requested: friendships.requested
                });
            });

            console.log('[' + (new Date()) + '] tid=' + topicData.id);

            function leaveTopic() {
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
});

http.listen(portNumber, function () {
    console.log('listening on *:' + portNumber);
});

app.use(express.static('./public'));