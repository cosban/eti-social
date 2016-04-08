// ==UserScript==
// @name         ETI Social
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Social ETI experience
// @author       - s otaku -
// @match        http://boards.endoftheinter.net/showmessages.php*
// @match        https://boards.endoftheinter.net/showmessages.php*
// @require      https://cdn.socket.io/socket.io-1.4.5.js
// @grant        none
// ==/UserScript==
/* jshint -W097 */

Array.prototype.findUser = function (user, remove) {
    var found = this.filter(function (thisUser) {
            var thisName = thisUser.name;
            return user.name === thisName;
        })[0] || false;
    if (remove && found) {
        this.splice(this.indexOf(found), 1);
    }
    return found;
};

(function () {
    'use strict';


    var socket,
        usersInTopic = [],
        friends = [],
        requests = [],
        pending = [],
        drawn = false,
        ui = document.createElement('div'),
        friendsList = document.createElement('div'),
        requestsList = document.createElement('div'),
        topicUl = document.createElement('ul'),
        friendsUl = document.createElement('ul'),
        requestsUl = document.createElement('ul'),
        friendsCount = document.createElement('span'),
        showFriendsBtn = document.createElement('a'),
        urlPrefix = location.href.match(/^(https?)/i)[1],
        topicId = parseInt(location.href.match(/topic=(\d+)/)[1]),
        tags = Array.apply(this, document.querySelectorAll('h2 a')),
        uiStyles = [
            'position: fixed',
            'top: 0',
            'font-size: 12px',
            'left: 15px',
            'padding: 2px',
            'background-color: rgba(255, 255, 255, 0.78)',
            'display: none'
        ],
        listStyles = [
            'list-style: none',
            'padding: 0',
            'margin: 0'
        ],
        friendStyles = [];

    if (!tags.length || tags.filter(function (tag) {
            return tag.innerHTML.trim().match(/^Anonymous$/i);
        }).length > 0) {
        console.log('Killing ETI Social script (Anonymous)');
        return;
    }
    else {
        socket = io(urlPrefix + '://eti-social.herokuapp.com', {
            'sync disconnect on unload': true
        });
        console.log('Running ETI Social');
    }

    socket.on('users', function (users) {
        usersInTopic = users.inTopic;
        friends = users.friends;
        requests = users.requests;
        pending = users.requested;

        drawUsers();
        drawNotifications();
    });
    socket.on('friendRequest', function (requesting) {
        console.log('<3 [friend request from:]', requesting.name);
        if (!requests.findUser(requesting)) {
            requests.push(requesting);
        }
        drawNotifications();
    });
    socket.on('friendJoined', function (joining) {
        console.log('[friend joined]', joining.name);
        if (!friends.findUser(joining)) {
            friends.push(joining);
        }
        drawUsers();
    });
    socket.on('friendLeft', function (leaving) {
        console.log('[friend left]', leaving.name);
        if (friends.findUser(leaving, true)) {
            drawUsers();
        }
    });
    socket.on('joined', function (joining) {
        console.log('[joined]', joining.name);
        if (!usersInTopic.findUser(joining)) {
            usersInTopic.push(joining);
            drawUsers();
        }
    });
    socket.on('left', function (leaving) {
        console.log('> [left]', leaving.name);
        if (usersInTopic.findUser(leaving, true)) {
            drawUsers();
        }
    });

    var topic = {
        user: {
            name: getUsername()
        },
        id: topicId
    };

    socket.emit('topic', topic);

    // build UI
    ui.setAttribute('style', uiStyles.join(';'));
    topicUl.setAttribute('style', listStyles.join(';') + [
            ';border-bottom: 1px solid black',
            'margin-bottom:  10px'].join(';'));
    friendsUl.setAttribute('style', listStyles.join(';'));
    requestsUl.setAttribute('style', listStyles.join(';'));
    friendsList.setAttribute('style', friendStyles.join(';'));
    showFriendsBtn.setAttribute('style', 'float:right; margin-left: 10px; cursor: pointer');
    friendsList.innerHTML = '<small>Friends Online: </small>';
    showFriendsBtn.innerHTML = ' <small>(show)</small>';
    requestsList.innerHTML = '<small>~ Friend Requests ~</small>';
    friendsList.appendChild(friendsCount);
    friendsList.appendChild(showFriendsBtn);
    ui.appendChild(topicUl);
    ui.appendChild(friendsList);
    ui.appendChild(requestsList);
    friendsList.appendChild(friendsUl);
    requestsList.appendChild(requestsUl);
    document.body.appendChild(ui);

    var showFriends = false;
    toggle(friendsUl, false);
    showFriendsBtn.addEventListener('click', function () {
        showFriends = !showFriends;
        showFriendsBtn.innerHTML = showFriends ? ' <small>(hide)</small>' : '<small>(show)</small>';
        toggle(friendsUl, showFriends);
    });

    function drawNotifications() {
        requestsUl.innerHTML = '';
        requests.forEach(function (requester) {
            var li = document.createElement('li'),
                opts = document.createElement('div'),
                yes = document.createElement('a'),
                no = document.createElement('a');

            var respond = function (response) {
                socket.emit('respondToRequest', requester, response);
                requests.findUser(requester, true);
                pending.findUser(requester, true);
                if (response) {
                    friends.push(requester);
                }
                drawNotifications();
                drawUsers();
            };

            yes.addEventListener('click', function () {
                respond(true);
            });
            no.addEventListener('click', function () {
                respond(false);
            });

            li.innerHTML = requester.name;
            yes.innerHTML = 'Yes';
            no.innerHTML = 'No';
            li.setAttribute('style', 'display:flex; justify-content: space-between');
            yes.setAttribute('style', 'cursor: pointer; margin: 0 10px;');
            no.setAttribute('style', 'cursor: pointer');

            opts.appendChild(yes);
            opts.appendChild(no);
            li.appendChild(opts);
            requestsUl.appendChild(li);
        });

        toggle(requestsList, requests.length);
        drawUsers();
    }

    function drawUsers() {
        topicUl.innerHTML = '';
        friendsUl.innerHTML = '';
        friendsCount.innerHTML = friends.length;

        usersInTopic.sort(function (a, b) {
            return a.friend ? 0 : 1;
        }).forEach(function (user) {
            user.friend = !!friends.findUser(user);
            user.pending = !!pending.findUser(user) || !!requests.findUser(user);
            var li = document.createElement('li');
            li.setAttribute('style', 'display:flex; justify-content:space-between');
            li.innerHTML = user.name;
            li.appendChild(friendButton(user));
            topicUl.appendChild(li);
        });
        friends.forEach(function (user) {
            friendsUl.innerHTML += '<li>' + user.name + ' </li>';
        });

        var show = usersInTopic.length || friends.length;
        toggle(ui, show);
        toggle(topicUl, usersInTopic.length);
        toggle(friendsList, friends.length);
    }

    function friendButton(user) {
        var btn = document.createElement('div');
        btn.setAttribute('style', 'margin-left: 15px');

        if (user.friend) {
            btn.innerHTML = '<3';
        }
        else if (!user.pending) {
            var a = document.createElement('a');
            a.innerHTML = '+';
            a.addEventListener('click', function () {
                socket.emit('friendRequest', user);
                pending.push(user);
                drawUsers();
            });
            a.setAttribute('style', 'cursor: pointer; font-size: 16px; line-height: 1');
            btn.appendChild(a);
        }
        else {
            btn.innerHTML = '<small>(pending)</small>';
        }

        return btn;
    }

    function toProp(prop) {
        return function (o) {
            return o[prop];
        };
    }

    function toggle(el, show) {
        var style = el.getAttribute('style') || '';
        style = style.replace(/display:\s*.+?(;|$)/ig, '');
        if (show) {
            style = 'display:block;' + style;
        }
        else {
            style = 'display:none;' + style;
        }
        el.setAttribute('style', style);
    }

    function getUsername() {
        return document.querySelector('.userbar a').innerHTML.match(/(.+?) \(.+?\)/)[1];
    }

})();
