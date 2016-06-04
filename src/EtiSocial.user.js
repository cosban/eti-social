// ==UserScript==
// @name         ETI Social
// @namespace    http://tampermonkey.net/
// @version      0.2.8.3
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
        debug = true,
        style = '<style>' +
            'span > span {display:inline-block;vertical-align:text-top;}' +
            '.eti-social, .eti-social a {color:black;}' +
            '.eti-social {position:fixed;top:0;font-size:12px;' +
            (JSON.parse(localStorage.getItem('eti-social-rightUI')) ? "right:15px;" : "left:15px;") +
            'padding:2px;background-color:rgba(255, 255, 255, 0.78);}' +
            '.settings { padding: 0px 30px 0 25px;margin: 0 0 0 5px;width:200px;border-left:1px rgba(0, 0, 0, 0.1) solid;background-color:rgba(255, 255, 255, 0.78);}' +
            '.small {font-size:10px}' +
            '.gap-left {margin-left: 15px} ' +
            'label {font-weight: bold}' +
            'a {cursor:pointer;} ' +
            'ul { margin: 0; padding: 10px; list-style: none;} ' +
            '.flex { display: flex; justify-content: space-between; }' +
            '.eti-chat { position:fixed;bottom:0;font-size:12px;width:200px;' +
            'right:25px;' + // for those we lost along the way
            'padding:2px;background-color:rgba(255, 255, 255, 1);}' +
            '.eti-chat-user { margin: auto 5px auto auto; font-weight:bold;}' +
            '.eti-chat-icons { position:absolute;right:1px; }' +
            '.eti-chat-content { background-color:rgba(0, 0, 0, 0.1);margin-bottom:5px;overflow-y:auto;height:200px;}' +
            '.eti-chat-message { margin: 2px 2px 7px 2px }' +
            '.eti-chat-input { border:1px rgba(0,0,0,0.2) solid;padding:2px;cursor:text; min-height:15px;word-wrap:break-word;}' +
            '</style>';

    if (!topicList && (!tags.length || tags.filter(function (tag) {
            return tag.innerHTML.trim().match(/^Anonymous$/i);
        }).length > 0)) {
        console.log('Killing ETI Social script (Anonymous)');
        return;
    }
    else {
        var url = debug ? '//localhost:3000' : '//eti-social.herokuapp.com';
        var hide = JSON.parse(localStorage.getItem('eti-social-isInvisible'));
        var share = JSON.parse(localStorage.getItem('eti-social-enableTopicSharing'));
        socket = io(url, {
            'sync disconnect on unload': true,
            query: {user: getUsername(), hide: hide, share: share}
        });
        console.log('Running ETI Social');
    }


    angular.module('eti.social', [])

        .directive('etiSocial', ["Topic", function (Topic) {
            return {
                template: '<span class="eti-social">' +
                '<span>' +
                '<div ng-show="eti.topic.active.length">In topic <ul>' +
                '<li class="flex" ng-repeat="user in eti.topic.active">' +
                '<div>{{ user.name }}</div>' +
                // chat bubble
                '<a style="margin-left: 5px;" ng-if="eti.enableTopicChat" ng-click="chat.beginChat(user)">💬</a>' +
                '<div class="gap-left">' +
                '<div ng-if="user.friend"><3</div>' +
                '<div ng-if="user.pending" style="font-size:10px;color:gray;">(pending)</div>' +
                '<a ng-if="!user.friend && !user.pending" ng-click="eti.request(user)">+</a>' +
                '</div>' +
                '</li>' +
                '</ul></div>' +
                '<div ng-hide="eti.topic.friends.length"><div class="flex">{{ eti.isInvisible ? "Invisible mode active" : "All alone :(" }}' +
                // Unicode U+2699 (the 'gear' emoji) was introduced in Unicode V4.1 in 2005 but seems to only work in browsers
                '<a style="margin-left:5px;" ng-click="eti.toggleShowSettings()">⚙</a>' +
                '</div></div>' +

                '<div ng-show="eti.topic.friends.length"><div class="flex">Friends: {{ eti.topic.friends.length }} of {{ eti.topic.totalFriends }}' +
                '<a class="gap-left small" ng-click="eti.toggleShowFriends()">{{ eti.showFriends ? "hide" : "show" }}</a>' +
                // Unicode U+2699 (the 'gear' emoji) was introduced in Unicode V4.1 in 2005 but seems to only work in browsers
                '<a style="margin-left:5px;" ng-click="eti.toggleShowSettings()">⚙</a>' +
                '</div>' +
                '<ul ng-show="eti.showFriends">' +
                '<li ng-repeat="user in eti.topic.friends">' +
                '<div ng-if="user.topics.length"> ' +
                '<a href="//boards.endoftheinter.net/showmessages.php?topic={{ user.topics[0].id }}&page={{ user.topics[0].page }}">{{ user.name }}</a>' +
                // chat bubble
                '<a style="margin-left:5px;" ng-if="eti.enableFriendChat" ng-click="chat.beginChat(user, true)">💬</a></div>' +
                // chat bubble
                '<div ng-if="!user.topics.length">{{ user.name }} <a style="margin-left:5px;" ng-if="eti.enableFriendChat" ng-click="chat.beginChat(user, true)">💬</a></div>' +
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
                '</ul></div></span>' +
                '<span class="settings" ng-show="eti.showSettings">' +
                '<h1>Settings</h1>' +
                '<div><p><i>Refresh or navigate to another page for changes to take effect.</i></p>' +
                '<label>Invisible Mode</label><input type="checkbox" ng-change="eti.toggleInvisibility()" ng-model="eti.isInvisible"/>' +
                '<p>Prevents you from appearing as online to other active. <i>NOTE: You will not be able to see other active either!</i></p>' +
                '<label>Enable Topic Sharing</label><input type="checkbox" ng-change="eti.toggleTopicSharing()" ng-model="eti.enableTopicSharing"/>' +
                '<p>Allows your friends to follow you into topics by clicking on your name within the online friends list.</p>' +

                '<label>Enable Chat with Friends</label><input type="checkbox" ng-change="eti.toggleFriendChat()" ng-model="eti.enableFriendChat"/>' +
                '<p>Allows you to chat with any of your online friends as you as long as they have chat enabled as well. <i>Chat is not saved.</i></p>' +
                '<label>Enable Chat with Topic Users</label><input type="checkbox" ng-change="eti.toggleTopicChat()" ng-model="eti.enableTopicChat"/>' +
                '<p>Allows you to chat with any active that are in the <b>same topic</b> as you as long as they have chat enabled as well. <i>Chat is not saved.</i></p>' +

                '<label>Move UI Right</label><input type="checkbox" ng-change="eti.toggleRightUI()" ng-model="eti.rightUI"/>' +
                '<p>Moves this UI to the right side of the screen.</p>' +
                /*
                 '<label>Friends Users</label><input type="text" readonly/>' +
                 '<p>This is your friend list. It is read only but great for copying so you can brag about how many friends you have.</p>' +
                 '<label>Blocked Users</label><input type="text"/>' +
                 '<p>Blocked active are not able to see you and you are not able to see them.</p>' +
                 */
                '</div></span></span>',
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

                        var inTopic = findUser(vm.topic.active, user);
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

                    // settings start here
                    // if you refresh, you don't want to see the settings again
                    vm.showSettings = false;
                    vm.toggleShowSettings = toggleShowSettings;
                    vm.toggleInvisibility = toggleInvisibility;
                    vm.toggleTopicSharing = toggleTopicSharing;
                    vm.toggleFriendChat = toggleFriendChat;
                    vm.toggleTopicChat = toggleTopicChat;
                    vm.toggleRightUI = toggleRightUI;
                    vm.isInvisible = JSON.parse(localStorage.getItem('eti-social-isInvisible')) || false;
                    vm.enableTopicSharing = JSON.parse(localStorage.getItem('eti-social-enableTopicSharing')) || false;
                    vm.enableFriendChat = JSON.parse(localStorage.getItem('eti-social-enableFriendChat')) || false;
                    vm.enableTopicChat = JSON.parse(localStorage.getItem('eti-social-enableTopicChat')) || false;
                    vm.rightUI = JSON.parse(localStorage.getItem('eti-social-rightUI')) || false;
                    vm.friends = null;
                    vm.blocked = null;

                    function toggleShowSettings() {
                        vm.showSettings = !vm.showSettings;
                    }

                    function toggleInvisibility() {
                        localStorage.setItem('eti-social-isInvisible', vm.isInvisible);
                    }

                    function toggleTopicSharing() {
                        localStorage.setItem('eti-social-enableTopicSharing', vm.enableTopicSharing);
                    }

                    function toggleFriendChat() {
                        localStorage.setItem('eti-social-enableFriendChat', vm.enableFriendChat);
                    }

                    function toggleTopicChat() {
                        localStorage.setItem('eti-social-enableTopicChat', vm.enableTopicChat);
                    }

                    function toggleRightUI() {
                        localStorage.setItem('eti-social-rightUI', vm.rightUI);
                    }
                }]
            };
        }])
        .directive('etiChat', ["Chat", "Topic", function (Chat, Topic) {
            return {
                template: '<div class="eti-chat" draggable ng-repeat="user in chat.active">' +
                '<div style="border-bottom: 1px solid rgba(0, 0, 0, 0.2);"><span><span class="eti-chat-user" style="margin-bottom: 5px">{{ user.name }}</span>' +
                '<span class="eti-chat-icons"><a ng-click="chat.toggleMinimized(user)">_</a><a ng-click="chat.closeChat(user)">✖️</a></span></span></div>' +
                '<div ng-hide="chat.isMinimized(user)" class="rigid">' +
                '<div class="eti-chat-content" id="{{ user.nwspname }}">' +
                // chat goes here
                '</div>' +
                '<div tabindex="0" class="eti-chat-input" ng-keypress="chat.input($event, user)" contentEditable="true"></div>' +
                '</div></div></div>',
                controllerAs: 'chat',
                controller: ["$document", "$scope", "Chat", "Topic", function ($document, $scope, Chat, Topic) {
                    var vm = this;

                    vm.toggleMinimized = toggleMinimized;
                    vm.isMinimized = isMinimized;
                    vm.input = input;
                    vm.beginChat = beginChat;
                    vm.closeChat = closeChat;

                    vm.topic = null;
                    vm.minimized = [];
                    vm.active = [];

                    function toggleMinimized(user) {
                        findUser(vm.minimized, user, true);
                    }

                    function isMinimized(user) {
                        return findUser(vm.minimized, user, false);
                    }

                    function input($event, user) {
                        var key = $event.key || $event.code;
                        var target = angular.element($event.target);
                        var msg = target.text();
                        switch (key.toLowerCase()) {
                            case "enter" :
                            {
                                $event.preventDefault();
                                socket.emit('chat', user, msg);
                                msg = '';
                                target.text(msg);
                                break;
                            }
                            case 'keym':
                            case 'm' :
                            {
                                // fuck you melon wolf
                                console.log("fuck you melon wolf");
                                $event.stopPropagation();
                                break;
                            }
                        }
                    }

                    function beginChat(user, prompted) {
                        if(prompted){
                            if (!findUser(vm.active, user, false)) {
                                vm.active.push(user);
                            }
                            return;
                        }
                        var friends = JSON.parse(localStorage.getItem('eti-social-enableFriendChat')) || false;
                        var topics = JSON.parse(localStorage.getItem('eti-social-enableTopicChat')) || false;
                        console.log(friends);
                        console.log(topics);
                        if (
                            (friends && findUser(vm.topic.friends, user, false)) ||
                            (topics && findUser(vm.topic.active, user, false))
                        ) {
                            if (!findUser(vm.active, user, false)) {
                                vm.active.push(user);
                            }
                        }
                    }

                    function closeChat(user) {
                        findUser(vm.active, user, true);
                    }

                    Chat.onUpdate(function (user) {
                        beginChat(user, false);
                        $scope.$apply();
                    });

                    Topic.getInfo().then(function (topic) {
                        vm.topic = topic;
                    });

                    Topic.onUpdate(function (topic) {
                        vm.topic = topic;
                        $scope.$apply();
                    });
                }]
            };
        }
        ])
        .directive('draggable', ["$document", function ($document) {
            return {
                link: function (scope, element, attr) {
                    var startX = 0, startY = 0, x = 25, y = 0;
                    element.on('mousedown', function (event) {
                        // Prevent default dragging of selected content
                        var target = angular.element(event.target);
                        if (!isAnchor(target)) {
                            return;
                        }
                        event.preventDefault();
                        var width = "innerWidth" in window ? window.innerWidth : document.documentElement.offsetWidth;
                        var height = "innerHeight" in window ? window.innerHeight : document.documentElement.offsetHeight;
                        startX = width - event.pageX - x;
                        startY = height - event.pageY - y;
                        $document.on('mousemove', mousemove);
                        $document.on('mouseup', mouseup);
                    });

                    function mousemove(event) {
                        var width = "innerWidth" in window ? window.innerWidth : document.documentElement.offsetWidth;
                        var height = "innerHeight" in window ? window.innerHeight : document.documentElement.offsetHeight;
                        y = height - event.pageY - startY;
                        x = width - event.pageX - startX;
                        if (y < 0) {
                            y = 0;
                        }
                        if (x < 0) {
                            x = 0;
                        }
                        element.css({
                            bottom: y + 'px',
                            right: x + 'px'
                        });
                    }

                    function mouseup() {
                        $document.off('mousemove', mousemove);
                        $document.off('mouseup', mouseup);
                    }

                    // an element is only draggable if it is not inside an element which is rigid
                    // so long as that rigid element is not a parent of a draggable element.
                    function isAnchor(target) {
                        if (target[0] === element[0]) {
                            return true;
                        }
                        if (target[0].classList.contains('rigid')) {
                            return false;
                        }
                        return isAnchor(target.parent());
                    }
                }
            };
        }])
        .factory('Chat', function () {
            var handlers = [];

            function onUpdate(handler) {
                handlers.push(handler);
            }

            function notify(data) {
                handlers.forEach(function (handler) {
                    handler(data);
                });
            }

            socket.on('chatReceived', function (sender, message) {
                notify(sender);
                var chatArea = angular.element(document.querySelector('#' + sender.nwspname));
                var element = '<div class="eti-chat-message"><span><span class="eti-chat-user">' +
                    sender.name +
                    ': </span>' +
                    message +
                    '</span></div>';
                chatArea.append(element);
                chatArea[0].scrollTop = chatArea[0].scrollHeight;
            });
            socket.on('chatSent', function (recipient, message) {
                var chatArea = angular.element(document.querySelector('#' + recipient.nwspname));
                var element = '<div class="eti-chat-message"><span><span class="eti-chat-user">' +
                    'You: </span>' +
                    message +
                    '</span></div>';
                chatArea.append(element);
                chatArea[0].scrollTop = chatArea[0].scrollHeight;
            });
            return {
                onUpdate: onUpdate,
                notify: notify
            };
        })
        .factory('Topic', ["$q", function ($q) {
            var topicData = {
                    active: null,
                    friends: null,
                    requests: null,
                    requested: null
                },
                fetchInfo = $q.defer();

            socket.on('active', function (userData) {
                topicData.friends = userData.friends;
                topicData.totalFriends = userData.totalFriends;
                topicData.requests = userData.requests;
                topicData.requested = userData.requested;
                topicData.active = userData.inTopic;

                fetchInfo.resolve(topicData);
            });


            socket.on('friendRequest', function (requester) {
                topicData.requests.push(requester);
                notify(topicData);
            });
            socket.on('friendJoined', function (joining) {
                topicData.friends.push(joining);

                var inTopic = findUser(topicData.active, joining);
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
                topicData.active.push(joining);
                notify(topicData);
            });
            socket.on('left', function (leaving) {
                findUser(topicData.active, leaving, true);
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
    ui.innerHTML = style + '<eti-social></eti-social><eti-chat></eti-chat>';
    document.body.appendChild(ui);
    angular.bootstrap(ui, ['eti.social']);
})
();
