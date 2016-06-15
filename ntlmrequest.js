module.exports = function(hostname, domain) {
    var Promise = require('promise');
    var users = require("../config/users");
    var ntlm = require('ntlm'),
        ntlmrequest = require('request').defaults({
            agentClass: require('agentkeepalive').HttpsAgent,
            rejectUnauthorized: false,
            headers: {
                "accept": "application/json; odata=verbose"
            }
        });

    function findUser(isAdmin) {
        var i = 0;
        for (; i < users.length; i++) {
            if (users[i].isAdmin == isAdmin) {
                return users[i];
            }
        }
        return null;
    }

    function get(getObj) {
        var user = findUser(getObj.isAdmin);
        return new Promise((resolve, reject) => {
            send(getObj.url, "GET", getObj.headers, user, null, resolve, reject);
        })
    }

    function post(postObj) {
        var user = findUser(postObj.isAdmin);
        return new Promise((resolve, reject) => {
            send(postObj.url, "POST", postObj.headers, user, postObj.data, resolve, reject);
        })
    }

    function send(url, method, headers, user, data, success, error) {
        if (typeof headers === "undefined") {
            headers = {};
        }
        var hr = JSON.parse(JSON.stringify(headers || {}));
        hr["Authorization"] = ntlm.challengeHeader(hostname, domain);
        ntlmrequest(url, {
            headers: hr,
            method: method,
            json: data
        }, function(err, res) {
            hr = JSON.parse(JSON.stringify(headers));
            hr["Authorization"] = ntlm.responseHeader(res, url, domain, user.username, user.password)
            ntlmrequest(url, {
                headers: hr,
                method: method,
                json: data
            }, function(err, res, body) {
                if (err) {
                    error(err);
                } else {
                    success(body);
                }
            });
        });
    }

    this.get = get;
    this.post = post;
};
