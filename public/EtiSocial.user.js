// ==UserScript==
// @name         ETI Social
// @namespace    http://tampermonkey.net/
// @version      0.2.4
// @description  Social ETI experience
// @author       - s otaku -
// @match        http://boards.endoftheinter.net/showmessages.php*
// @match        https://boards.endoftheinter.net/showmessages.php*
// @require      https://cdn.socket.io/socket.io-1.4.5.js
// @require      https://ajax.googleapis.com/ajax/libs/angularjs/1.4.5/angular.min.js
// @grant        none
// ==/UserScript==
!function(){"use strict"
function e(e,n,i){var t=e.filter(function(e){var i=e.name
return n.name===i})[0]||!1
return i&&t&&e.splice(e.indexOf(t),1),t}function n(){return document.querySelector(".userbar a").innerHTML.match(/(.+?) \(.+?\)/)[1]}var i,t=document.createElement("div"),s=location.href.match(/^(https?)/i)[1],o=Array.apply(this,document.querySelectorAll("h2 a")),r=!1
if(!o.length||o.filter(function(e){return e.innerHTML.trim().match(/^Anonymous$/i)}).length>0)return void console.log("Killing ETI Social script (Anonymous)")
var l=r?"http://localhost:3000":s+"://eti-social.herokuapp.com"
i=io(l,{"sync disconnect on unload":!0,query:{user:n()}}),console.log("Running ETI Social"),angular.module("eti.social",[]).directive("etiSocial",["Topic",function(n){return{template:'<style>eti-social {position:fixed;top:0;font-size:12px;left:15px;padding:2px;background-color:rgba(255, 255, 255, 0.78)}.small {font-size:10px}.gap-left {margin-left:15px} a {cursor:pointer;} ul { margin: 0; padding: 10px; list-style: none;} .flex { display: flex; justify-content: space-between; }</style><div ng-show="eti.topic.users.length">In topic <ul><li class="flex" ng-repeat="user in eti.topic.users"><div>{{ user.name }}</div><div class="gap-left"><div ng-if="user.friend"><3</div><div ng-if="user.pending" style="font-size:10px;color:gray;">(pending)</div><a ng-if="!user.friend && !user.pending" ng-click="eti.request(user)">+</a></div></li></ul></div><div ng-show="eti.topic.friends.length"><div class="flex">Friends: {{ eti.topic.friends.length }}<a class="gap-left small" ng-click="eti.toggleShowFriends()">{{ eti.showFriends ? "hide" : "show" }}</a></div><ul ng-show="eti.showFriends"><li ng-repeat="user in eti.topic.friends"><a href="//boards.endoftheinter.net/showmessages.php?topic={{ user.topics[0].id }}">{{ user.name }}</a></li></ul></div><div ng-show="eti.topic.requests.length">Requests: <ul><li ng-repeat="user in eti.topic.requests" class="flex"><div>{{ user.name }}</div><div class="gap-left"><a ng-click="eti.respond(user, true)">Yes</a><a ng-click="eti.respond(user, false)" class="gap-left">No</a></div></li></ul></div>',controllerAs:"eti",controller:["$scope","Topic",function(n,t){function s(){l.showFriends=!l.showFriends,localStorage.setItem("eti-social-showFriends",l.showFriends)}function o(e){i.emit("friendRequest",e),e.pending=!0}function r(n,t){i.emit("respondToRequest",n,t),e(l.topic.requests,n,!0)
var s=e(l.topic.users,n)
s&&(s.pending=!1,s.friend=!!t)}var l=this
l.topic=null,l.showFriends=JSON.parse(localStorage.getItem("eti-social-showFriends"))||!1,l.toggleShowFriends=s,l.request=o,l.respond=r,t.getInfo().then(function(e){l.topic=e}),t.onUpdate(function(e){l.topic=e,n.$apply()})}]}}]).factory("Topic",["$q",function(n){function t(e){l.push(e)}function s(e){l.forEach(function(n){n(e)})}var o={users:null,friends:null,requests:null,requested:null},r=n.defer()
i.on("users",function(e){o.friends=e.friends,o.requests=e.requests,o.requested=e.requested,o.users=e.inTopic,r.resolve(o)}),i.on("friendRequest",function(e){o.requests.push(e),s(o)}),i.on("friendJoined",function(e){o.friends.push(e),s(o)}),i.on("friendLeft",function(n){e(o.friends,n,!0),s(o)}),i.on("joined",function(e){o.users.push(e),s(o)}),i.on("left",function(n){e(o.users,n,!0),s(o)})
var l=[]
return{getInfo:function(){return r.promise},onUpdate:t,notify:s}}]),t.innerHTML="<eti-social></eti-social>",document.body.appendChild(t),angular.bootstrap(t,["eti.social"])}()
