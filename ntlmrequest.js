const nc = require("ntlm-client");

module.exports = function (protocol, hostname, domain, users) {
    var Promise = require('promise');
    var ntlm = require('ntlm'),
        ntlmrequest = {};
    if (protocol === "http") {
        ntlmrequest = require('request').defaults({
            agentClass: require('agentkeepalive').HttpAgent,
            rejectUnauthorized: false,
            headers: {
                "accept": "application/json; odata=verbose"
            }
        });
    } else if (protocol === "https") {
        ntlmrequest = require('request').defaults({
            agentClass: require('agentkeepalive').HttpsAgent,
            rejectUnauthorized: false,
            headers: {
                "accept": "application/json; odata=verbose"
            }
        });
    } else {
        throw new Error("Please use 'http' or 'https' protocols");
    }

    function findUser(isAdmin) {
        isAdmin = isAdmin || false;
        var i = 0;
        for (; i < users.length; i++) {
            if (users[i].isAdmin == isAdmin) {
                return users[i];
            }
        }
        throw new Error("User not found");
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

        return nc.request({
            uri: url,
            method: method,
            username: domain + "\\" + user.username,
            password: user.password,
            request: {
                json: data
            }
        })
        .then(d=>{
            success(d);
        })
        .catch(e=>{
            error(e);
        })

        var hr = JSON.parse(JSON.stringify(headers || {}));
        hr["Authorization"] = ntlm.challengeHeader(hostname, domain);
        ntlmrequest(url, {
            headers: hr,
            method: method,
            json: data
        }, function (err, res) {
            hr = JSON.parse(JSON.stringify(headers));
            try {
                hr["Authorization"] = ntlm.responseHeader(res, url, domain, user.username, user.password)
            } catch (e) {
                throw new Error(e + " | " + err);
            }
            ntlmrequest(url, {
                headers: hr,
                method: method,
                json: data
            }, function (err, res, body) {
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