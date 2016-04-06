// ==UserScript==
// @name         ETI Social
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Social ETI experience
// @author       - s otaku -
// @match        http://boards.endoftheinter.net/showmessages.php*
// @match        https://boards.endoftheinter.net/showmessages.php*
// @require      https://cdn.socket.io/socket.io-1.4.5.js
// @grant        none
// ==/UserScript==
/* jshint -W097 */
'use strict';

console.log('Running ETI Social');


var socket = io('http://localhost:3000');
var users = [];
var topicId = parseInt(location.href.match(/topic=(\d+)/)[1]);


var ul = document.createElement('ul');
ul.setAttribute('style', ['position: fixed',
    'top: 0',
    'font-size: 16px',
    'border: 1px solid black',
    'right: 15px',
    'padding: 10px 10px 10px 25px',
    'background-color: rgba(255, 255, 255, 0.38)'].join(';'));


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

socket.emit('topic', {
    user: {
        name: getUsername()
    },
    id: topicId
});

var drawn = false;
function drawUsers() {
    ul.innerHTML = '';
    users.forEach(function (user) {
        ul.innerHTML += '<li>' + user.name + '</li>';
    });
    if(!drawn) {
        drawn = true;
        document.body.appendChild(ul);
    }
}

function getUsername() {
    var username = localStorage.getItem('eti-username') || prompt('Enter your nickname!');
    localStorage.setItem('eti-username', username);
    return username;
}
