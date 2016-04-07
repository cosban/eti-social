// ==UserScript==
// @name         ETI Social
// @namespace    http://tampermonkey.net/
// @version      0.0.8
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

    var urlPrefix = location.href.match(/^(https?)/i)[1];
    var socket = io(urlPrefix + '://eti-social.herokuapp.com');
    var users = [];
    var topicId = parseInt(location.href.match(/topic=(\d+)/)[1]);
    var tags = [];
    tags.push.apply(tags, document.querySelectorAll('h2 a'));
    if (!tags.length || tags.filter(function (tag) {
            return tag.innerHTML.trim().match(/^Anonymous$/i);
        }).length > 0) {
        console.log('Killing ETI Social script (Anonymous)');
        return;
    }
    else {
        console.log('Running ETI Social');
    }


    var ul = document.createElement('ul');
    ul.setAttribute('style', [
        'position: fixed',
        'top: 0',
        'font-size: 12px',
        'right: 15px',
        'padding: 2px',
        'background-color: rgba(255, 255, 255, 0.78)',
        'list-style: none'
    ].join(';'));


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

    /*var kill, killed = false;
     document.addEventListener('visibilitychange', function (event) {
     clearTimeout(kill);

     var hidden = document.visibilityState === 'hidden';
     if(hidden && !killed) {
     kill = setTimeout(function () {
     socket.emit('leave');
     killed = true;
     }, 30000);
     }
     else {
     if(killed) {
     killed = false;
     socket.emit('topic', topic);
     }
     }
     });*/

    var drawn = false;

    function drawUsers() {
        ul.innerHTML = '';
        users.forEach(function (user) {
            ul.innerHTML += '<li>' + user.name + '</li>';
        });
        if (!drawn) {
            drawn = true;
            document.body.appendChild(ul);
        }
    }

    function getUsername() {
        var username = localStorage.getItem('eti-social-username') ||
            document.querySelector('.userbar a').innerHTML.match(/(.+?) \(.+?\)/)[1];
        localStorage.setItem('eti-social-username', username);
        return username;
    }

})();
