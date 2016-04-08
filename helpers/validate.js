var request = require('request');

module.exports = {
    etiLogin: function (user, ip) {
        return new Promise(function (res, rej) {
            var url = 'http://boards.endoftheinter.net/scripts/login.php?username=' + user + '&ip=' + ip;

            if(process.env.DEV) {
                console.log('Skipping validation [dev env]');
                return res(true);
            }

            request(url, function (error, response, body) {
                try {
                    if (!error && response.statusCode == 200 && body && body.match(new RegExp('1:' + user))) {
                        res(true);
                    }
                    else {
                        rej('[ERROR] failed ETI validation:', user, ip);
                    }
                }
                catch (e) {
                    rej('[ERROR], failed ETI validation:', e, user, ip);
                }
            });
        });
    }
};