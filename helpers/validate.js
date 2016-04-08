var request = require('request');

module.exports = {
    etiLogin: function (user, ip) {
        console.log('validating:', user, ip);
        return new Promise(function (res, rej) {
            var url = 'http://boards.endoftheinter.net/scripts/login.php?username=' + user + '&ip=' + ip;

            request(url, function (error, response, body) {
                if (!error && response.statusCode == 200 && body.match('1:' + user)) {
                    res(true);
                }
                else {
                    rej('[ERROR] failed ETI validation');
                }
            });
        });
    }
};