// ==UserScript==
// @name         ETI Social
// @namespace    http://tampermonkey.net/
// @version      0.2.1
// @description  Social ETI experience
// @author       - s otaku -
// @match        http://boards.endoftheinter.net/showmessages.php*
// @match        https://boards.endoftheinter.net/showmessages.php*
// @require      https://cdn.socket.io/socket.io-1.4.5.js
// @require      https://ajax.googleapis.com/ajax/libs/angularjs/1.4.5/angular.min.js
// @grant        none
// ==/UserScript==
/* jshint -W097 */

(function () {
    'use strict';

    function findUser (arr, user, remove) {
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
        return document.querySelector('.userbar a').innerHTML.match(/(.+?) \(.+?\)/)[1];
    }

    var socket,
        ui = document.createElement('div'),
        urlPrefix = location.href.match(/^(https?)/i)[1],
        topicId = parseInt(location.href.match(/topic=(\d+)/)[1]),
        tags = Array.apply(this, document.querySelectorAll('h2 a')),
        debug = false;

    if (!tags.length || tags.filter(function (tag) {
            return tag.innerHTML.trim().match(/^Anonymous$/i);
        }).length > 0) {
        console.log('Killing ETI Social script (Anonymous)');
        return;
    }
    else {
        var url = debug ? 'http://localhost:3000' : urlPrefix + '://eti-social.herokuapp.com';
        socket = io(url, {
            'sync disconnect on unload': true
        });
        console.log('Running ETI Social');
    }


    angular.module('eti.social', [])

        .directive('etiSocial', function (Topic) {
            return {
                template: '<style>' + 
                        'eti-social {position:fixed;top:0;font-size:12px;left:15px;padding:2px;background-color:rgba(255, 255, 255, 0.78)}' + 
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

                    '<div ng-show="eti.topic.friends.length">Friends: {{ eti.topic.friends.length }}' + 
                    '<ul>' + 
                    '<li ng-repeat="user in eti.topic.friends">{{ user.name }}</li>' + 
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
                controller: function ($scope, Topic) {
                    var vm = this;

                    vm.topic = null;
                    vm.request = request;
                    vm.respond = respond;

                    function request (user) {
                        socket.emit('friendRequest', user);
                        user.pending = true;
                    }

                    function respond (user, accept) {
                        socket.emit('respondToRequest', user, accept);
                        findUser(vm.topic.requests, user, true);

                        var inTopic = findUser(vm.topic.users, user);
                        if(inTopic) {
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
                }
            };
        })

        .factory('Topic', function($q) {
            var topicData = {
                    users: null,
                    friends: null,
                    requests: null,
                    requested: null
                },
                topic = {
                    id: topicId,
                    user: {
                        name: getUsername()
                    }
                },
                fetchInfo = $q.defer();

            function toUser (user) {
                var friend = user.friend || findUser(topicData.friends, user),
                    pending = (findUser(topicData.requests, user) || findUser(topicData.requested, user)) && !friend;
                return {
                    name: user.name,
                    friend: friend,
                    pending: pending
                };
            }

            socket.emit('topic', topic);

            socket.on('users', function (userData) {
                topicData.friends = userData.friends;
                topicData.requests = userData.requests;
                topicData.requested = userData.requested;
                topicData.users = userData.inTopic.map(toUser);

                fetchInfo.resolve(topicData);
            });


            socket.on('friendRequest', function (requester) {
                topicData.requests.push(requester);
                notify(topicData);
            });
            socket.on('friendJoined', function (joining) {
                topicData.friends.push(joining);
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

            function onUpdate (handler) {
                handlers.push(handler);
            }
            function notify (data) {
                topicData.users = topicData.users.map(toUser);

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
        });

    // build UI
    ui.innerHTML = '<eti-social></eti-social>';
    document.body.appendChild(ui);
    angular.bootstrap(ui, ['eti.social']);
})();
