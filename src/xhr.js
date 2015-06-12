import request from 'request';

export default (options) => new Promise((resolve, reject) => {
  request(options, (err, res) => {
    if (err) {
      return reject(err);
    } else if (res.statusCode < 200 || res.statusCode >= 400) {
      return reject(res);
    }
    return resolve(res);
  });
});
