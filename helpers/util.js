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
Array.prototype.inTopic = function (topic) {
    return this.filter(function (user) {
        return user.topics.propFilter('id', topic.id).length > 0;
    });
};

var count = 0;

global.log = function () {
    arguments[0] = ++count + '.\t' + arguments[0];
    return console.log.apply(this, arguments);
};