Array.prototype.remove = function (item) {
    var i = this.indexOf(item);
    if (~i) {
        this.splice(i, 1);
    }
};
Array.prototype.propFilter = function (prop, val) {
    return this.filter(function (o) {
        return o[prop] === val;
    });
};
Array.prototype.propMap = function (prop) {
    return this.map(function (o) {
        var result = {};
        result[prop] = o[prop];
        return result;
    });
};
Array.prototype.findUser = function (user) {
    if (!user) {
        console.log('ERROR, no user');
        return [];
    }

    return this.filter(function (item) {
            var thisName = item.etiUser ? item.etiUser.name : item.name;
            return user.name === thisName;
        }) || false;
};
Array.prototype.withUsers = function (users) {
    return this.filter(function (socket) {
        return users.filter(function (user) {
                return user.name === socket.etiUser.name;
            }).length > 0;
    });
};
Array.prototype.inTopic = function (topic) {
    return this.filter(function (user) {
        return user.topics.propFilter('id', topic.id).length > 0;
    });
};

global.forEach = forEach;

function forEach(obj, handler) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            handler(obj[prop]);
        }
    }
}