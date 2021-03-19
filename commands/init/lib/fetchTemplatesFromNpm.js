const request = require('@antipasjiajia-cli-dev/request');

module.exports = function () {
  return request({
    url: '/project/template'
  });
};
