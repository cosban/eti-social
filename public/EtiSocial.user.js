// ==UserScript==
// @name         ETI Social
// @namespace    http://tampermonkey.net/
// @version      0.2.8.2
// @description  Social ETI experience
// @author       - s otaku -
// @match        http://boards.endoftheinter.net/showmessages.php*
// @match        https://boards.endoftheinter.net/showmessages.php*
// @match        http://boards.endoftheinter.net/topics/*
// @match        https://boards.endoftheinter.net/topics/*
// @require      https://cdn.socket.io/socket.io-1.4.5.js
// @require      https://ajax.googleapis.com/ajax/libs/angularjs/1.4.5/angular.min.js
// @grant        none
// ==/UserScript==
/* jshint -W097 */

(function () {
    'use strict';

    function findUser(arr, user, remove) {
        var found = arr.filter(function (thisUser) {
                var thisName = thisUser.name;
                return user.name === thisName;
            })[0] || false;
        if (remove && found) {
            arr.splice(arr.indexOf(found), 1);
        }
        return found;
    }

    function getUsername() {
        var name = document.querySelector('.userbar a').innerHTML.match(/(.+?) \(.+?\)/)[1];
        if (/^cute girl/i.test(name)) {
            var replace = localStorage.getItem('eti-social-replace-cute-girl') || prompt('WARNING! Cute Girl script detected. the sociaLL script needs your real username. Should I ignore the Cute Girl? (ignore this message if your name really starts with Cute Girl)');
            localStorage.setItem('eti-social-replace-cute-girl', replace);
            if (replace) {
                name = name.replace(/^cute girl\s?/i, '');
            }
        }
        return name;
    }

    var socket,
        ui = document.createElement('div'),
        urlPrefix = location.href.match(/^(https?)/i)[1],
        tags = Array.apply(this, document.querySelectorAll('h2 a')),
        topicList = !location.href.match(/showmessages\.php/),
        debug = false;

    if (!topicList && (!tags.length || tags.filter(function (tag) {
            return tag.innerHTML.trim().match(/^Anonymous$/i);
        }).length > 0)) {
        console.log('Killing ETI Social script (Anonymous)');
        return;
    }
    else {
        var url = debug ? '//localhost:3000' : '//eti-social.herokuapp.com';
        socket = io(url, {
            'sync disconnect on unload': true,
            query: {user: getUsername()}
        });
        console.log('Running ETI Social');
    }


    angular.module('eti.social', [])

        .directive('etiSocial', ["Topic", function (Topic) {
            return {
                template: '<style>' +
                'eti-social {position:fixed;top:0;font-size:12px;left:15px;padding:2px;background-color:rgba(255, 255, 255, 0.78)}' +
                '.small {font-size:10px}' +
                '.gap-left {margin-left:15px} ' +
                'a {cursor:pointer;} ' +
                'ul { margin: 0; padding: 10px; list-style: none;} ' +
                '.flex { display: flex; justify-content: space-between; }' +
                '</style>' +
                '<div ng-show="eti.topic.users.length">In topic <ul>' +
                '<li class="flex" ng-repeat="user in eti.topic.users">' +
                '<div>{{ user.name }}</div>' +
                '<div class="gap-left">' +
                '<div ng-if="user.friend"><3</div>' +
                '<div ng-if="user.pending" style="font-size:10px;color:gray;">(pending)</div>' +
                '<a ng-if="!user.friend && !user.pending" ng-click="eti.request(user)">+</a>' +
                '</div>' +
                '</li>' +
                '</ul></div>' +

                '<div ng-show="eti.topic.friends.length"><div class="flex">Friends: {{ eti.topic.friends.length }} of {{ eti.topic.totalFriends }}' +
                '<a class="gap-left small" ng-click="eti.toggleShowFriends()">{{ eti.showFriends ? "hide" : "show" }}</a></div>' +
                '<ul ng-show="eti.showFriends">' +
                '<li ng-repeat="user in eti.topic.friends">' +
                '<a ng-if="user.topics.length" href="//boards.endoftheinter.net/showmessages.php?topic={{ user.topics[0].id }}&page={{ user.topics[0].page }}">{{ user.name }}</a>' +
                '<div ng-if="!user.topics.length">{{ user.name }}</div>' +
                '</li>' +
                '</ul></div>' +

                '<div ng-show="eti.topic.requests.length">Requests: <ul>' +
                '<li ng-repeat="user in eti.topic.requests" class="flex">' +
                '<div>{{ user.name }}</div>' +
                '<div class="gap-left">' +
                '<a ng-click="eti.respond(user, true)">Yes</a>' +
                '<a ng-click="eti.respond(user, false)" class="gap-left">No</a>' +
                '</div>' +
                '</li>' +
                '</ul></div>',
                controllerAs: 'eti',
                controller: ["$scope", "Topic", function ($scope, Topic) {
                    var vm = this;

                    vm.topic = null;
                    vm.showFriends = JSON.parse(localStorage.getItem('eti-social-showFriends')) || false;
                    vm.toggleShowFriends = toggleShowFriends;
                    vm.request = request;
                    vm.respond = respond;


                    function toggleShowFriends() {
                        vm.showFriends = !vm.showFriends;
                        localStorage.setItem('eti-social-showFriends', vm.showFriends);
                    }

                    function request(user) {
                        socket.emit('friendRequest', user);
                        user.pending = true;
                    }

                    function respond(user, accept) {
                        socket.emit('respondToRequest', user, accept);
                        findUser(vm.topic.requests, user, true);

                        var inTopic = findUser(vm.topic.users, user);
                        if (inTopic) {
                            inTopic.pending = false;
                            inTopic.friend = !!accept;
                        }
                    }

                    Topic.getInfo().then(function (topic) {
                        vm.topic = topic;
                    });
                    Topic.onUpdate(function (topic) {
                        vm.topic = topic;
                        $scope.$apply();
                    });
                }]
            };
        }])

        .factory('Topic', ["$q", function ($q) {
            var topicData = {
                    users: null,
                    friends: null,
                    requests: null,
                    requested: null
                },
                fetchInfo = $q.defer();

            socket.on('users', function (userData) {
                topicData.friends = userData.friends;
                topicData.totalFriends = userData.totalFriends;
                topicData.requests = userData.requests;
                topicData.requested = userData.requested;
                topicData.users = userData.inTopic;

                fetchInfo.resolve(topicData);
            });


            socket.on('friendRequest', function (requester) {
                topicData.requests.push(requester);
                notify(topicData);
            });
            socket.on('friendJoined', function (joining) {
                topicData.friends.push(joining);

                var inTopic = findUser(topicData.users, joining);
                if (inTopic && inTopic.pending) {
                    inTopic.friend = true;
                    inTopic.pending = false;
                }
                notify(topicData);
            });
            socket.on('friendLeft', function (leaving) {
                findUser(topicData.friends, leaving, true);
                notify(topicData);
            });
            socket.on('joined', function (joining) {
                topicData.users.push(joining);
                notify(topicData);
            });
            socket.on('left', function (leaving) {
                findUser(topicData.users, leaving, true);
                notify(topicData);
            });

            var handlers = [];

            function onUpdate(handler) {
                handlers.push(handler);
            }

            function notify(data) {
                handlers.forEach(function (handler) {
                    handler(data);
                });
            }

            return {
                getInfo: function () {
                    return fetchInfo.promise;
                },

                //  events
                onUpdate: onUpdate,
                notify: notify
            };
        }]);

    // build UI
    ui.innerHTML = '<eti-social></eti-social>';
    document.body.appendChild(ui);
    angular.bootstrap(ui, ['eti.social']);
})();
