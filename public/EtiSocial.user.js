// ==UserScript==
// @name         ETI Social
// @namespace    http://tampermonkey.net/
// @version      0.0.9.1
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

    var users = [],
        drawn = false,
        ul = document.createElement('ul'),
        urlPrefix = location.href.match(/^(https?)/i)[1],
        socket = io(urlPrefix + '://eti-social.herokuapp.com'),
        topicId = parseInt(location.href.match(/topic=(\d+)/)[1]),
        tags = Array.apply(this, document.querySelectorAll('h2 a')),
        styles = [
            'position: fixed',
            'top: 0',
            'font-size: 12px',
            'left: 15px',
            'padding: 2px',
            'background-color: rgba(255, 255, 255, 0.78)',
            'list-style: none'
        ];

    if (!tags.length || tags.filter(function (tag) {
            return tag.innerHTML.trim().match(/^Anonymous$/i);
        }).length > 0) {
        console.log('Killing ETI Social script (Anonymous)');
        return;
    }
    else {
        console.log('Running ETI Social');
    }

    socket.on('activeUsers', function (activeUsers) {
        users = activeUsers;
        drawUsers();
    });
    socket.on('joined', function (joining) {
        users.push(joining);
        drawUsers();
    });
    socket.on('left', function (leaving) {
        users.splice(users.indexOf(users.filter(function (user) {
            return user.name === leaving.name;
        })[0]), 1);
        drawUsers();
    });

    var topic = {
        user: {
            name: getUsername()
        },
        id: topicId
    };

    socket.emit('topic', topic);

    function drawUsers() {
        if (users.length === 1 && users[0].name === topic.user.name) {
            return;
        }
        ul.innerHTML = '';
        users.forEach(function (user) {
            ul.innerHTML += '<li>' + user.name + '</li>';
        });
        if (!drawn) {
            ul.setAttribute('style', styles.join(';'));
            document.body.appendChild(ul);
            drawn = true;
        }
    }

    function getUsername() {
        var username = localStorage.getItem('eti-social-username') ||
            document.querySelector('.userbar a').innerHTML.match(/(.+?) \(.+?\)/)[1];
        localStorage.setItem('eti-social-username', username);
        return username;
    }

})();
