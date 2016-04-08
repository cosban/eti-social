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

            log('[user]', username);
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
                Friendships.request(user, newFriend);
            });
            socket.on('respondToRequest', function (newFriend, response) {
                Friendships.respondToRequest(user, newFriend, response);
            });
            socket.on('disconnect', leaveTopic);

            Friendships.ofUser(user).then(function (friendships) {
                log('resolved friendships:', friendships);

                var friends = friendships.friends.map(function (user) {
                    return user.name;
                });
                var requested = friendships.requested.map(function (user) {
                    return user.name;
                });

                if (user.joining) {
                    delete user.joining;

                    connections.forEach(function (sock) {
                        if (friends.indexOf(sock.etiUser.name) > -1) {
                            sock.emit('friendJoined', user);
                        }
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
                    requests: friendships.requests
                });
            });

            log('[topic]', user.name, topicData.id);

            function leaveTopic() {
                user.topics.remove(topic);

                if (user.topics.propFilter('id', topic.id).length === 0) {
                    emit(user, 'left', topic);
                }

                log('[[disconnect topic]]', user.name, topicData.id);

                if (!user.topics.length) {
                    activeUsers.remove(user);
                    connections.remove(socket);
                    log('[[disconnect user]]', user.name);

                    Friendships.ofUser(user).then(function (friendships) {
                        var friends = friendships.friends.map(function (user) {
                            return user.name;
                        });

                        connections.filter(function (sock) {
                            return friends.indexOf(sock.etiUser.name) > -1;
                        }).forEach(function (sock) {
                            sock.emit('friendLeft', user);
                        });
                    }, function (err) {
                        console.log('ERR', err);
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