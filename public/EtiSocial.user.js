// ==UserScript==
// @name         ETI Social
// @namespace    http://tampermonkey.net/
// @version      0.0.9.6
// @description  Social ETI experience
// @author       - s otaku -
// @match        http://boards.endoftheinter.net/showmessages.php*
// @match        https://boards.endoftheinter.net/showmessages.php*
// @require      https://cdn.socket.io/socket.io-1.4.5.js
// @grant        none
// ==/UserScript==
/* jshint -W097 */

(function () {
    'use strict';

    var socket,
        users = [],
        friends = [],
        drawn = false,
        ui = document.createElement('div'),
        topicUl = document.createElement('ul'),
        friendsUl = document.createElement('ul'),
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
        ];

    if (!tags.length || tags.filter(function (tag) {
            return tag.innerHTML.trim().match(/^Anonymous$/i);
        }).length > 0) {
        console.log('Killing ETI Social script (Anonymous)');
        return;
    }
    else {
        socket = io(urlPrefix + '://eti-social.herokuapp.com');
        console.log('Running ETI Social');
    }

    socket.on('friends', function (activeFriends) {
        friends = activeFriends;
        drawUsers();
    });

    socket.on('activeUsers', function (activeUsers) {
        users = activeUsers;
        drawUsers();
    });
    socket.on('joined', function (joining) {
        console.log('[joined]', joining.name);
        users.push(joining);
        drawUsers();
    });
    socket.on('left', function (leaving) {
        console.log('> [left]', leaving.name);
        var user = users.filter(function (user) {
            return user.name === leaving.name;
        })[0];
        if (user) {
            var i = users.indexOf(user);
            users.splice(i, 1);
        }
        drawUsers();
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
    topicUl.setAttribute('style', listStyles.join(';'));
    friendsUl.setAttribute('style', listStyles.join(';'));
    ui.appendChild(topicUl);
    ui.appendChild(friendsUl);
    document.body.appendChild(ui);

    function drawUsers() {
        topicUl.innerHTML = '';
        friendsUl.innerHTML = '';

        users.forEach(function (user) {
            topicUl.innerHTML += '<li>' + user.name + '</li>';
        });
        friends.forEach(function (user) {
            friendsUl.innerHTML += '<li>' + user.name + '</li>';
        });

        var show = users.length || friends.length;
        toggle(ui, show);
    }

    function toggle(el, show) {
        var style = el.getAttribute('style') || '';
        style = style.replace(/display:\s*.+?;?/ig, '');
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
