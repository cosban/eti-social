var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var util = require('./helpers/util');


app.use(express.static('./public'));

var activeUsers = [];

function validate(user, ip) {
    return new Promise(function (res, rej) {
        res(true);
    });
}

function connect(topicData, clientIp) {
    var username = topicData.user.name;

    return validate(username, clientIp).then(function () {
        var user = activeUsers.propFilter('name', username)[0];

        if (!user) {
            user = {
                name: username,
                topics: []
            };
            activeUsers.push(user);

            log('[user]', username);
        }
        return user;
    });
}

function emit(user, action, topic) {
    io.in(topic.id).emit(action, { name: user.name });
}

io.on('connection', function (socket) {
    var clientIp = socket.request.connection.remoteAddress;

    socket.on('topic', function (topicData) {
        connect(topicData, clientIp).then(function (user) {
            var topic = user.topics.propFilter('id', topicData.id)[0];

            if(!topic) {
                topic = {id: topicData.id};
                emit(user, 'joined', topic);
            }
            user.topics.push(topic);

            socket.join(topic.id);
            socket.emit('activeUsers', activeUsers.inTopic(topic).propMap('name'));

            log('[topic]', user.name, topicData.id);

            socket.on('disconnect', function () {
                user.topics.remove(topic);

                if(user.topics.propFilter('id', topic.id).length === 0) {
                    emit(user, 'left', topic);
                }

                log('[[disconnect topic]]', user.name, topicData.id);

                if (!user.topics.length) {
                    activeUsers.remove(user);
                    log('[[disconnect user]]', user.name);
                }
            });
        });
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});