import assign from 'object-assign';
import xhr from './xhr';

const TYPES_TO_METHOD = {
  CREATE: 'POST',
  READ: 'GET',
  UPDATE: 'PUT',
  DELETE: 'DELETE'
};
const BODY_METHODS = [
  'POST',
  'PUT'
];

function getHttpRequest(queryRequest) {
  let url = `/${queryRequest.collection}`;
  if (queryRequest.params.$id) {
    url += '/<$id>';
  }
  return {
    url,
    name: queryRequest.name,
    collection: queryRequest.collection,
    params: queryRequest.params,
    paramDependencies: queryRequest.paramDependencies,
    method: TYPES_TO_METHOD[queryRequest.type],
    getFullUrl(params, options = {}) {
      const path = queryRequest.params.$id ? url.replace('<$id>', encodeURIComponent(params.$id || 'null')) : url;
      const baseUrl = options.baseUrl || '';
      return stripTrailingSlash(baseUrl) + addLeadingSlash(path);
    }
  };
}

function prepareForQueryString(params) {
  return Object.keys(params).reduce((obj, key) => assign(obj, {[key]: JSON.stringify(params[key])}), {});
}

function getHttpRequests(queryRequests) {
  return queryRequests.map(getHttpRequest);
}

function hasBody(request) {
  return BODY_METHODS.indexOf(request.method) > -1;
}

function addLeadingSlash(url) {
  if (url[0] !== '/') {
    return `/${url}`;
  }
  return url;
}

function stripTrailingSlash(url) {
  if (url[url.length - 1] === '/') {
    return url.slice(0, -1);
  }
  return url;
}

function run({request, params, data, options}) {
  const httpRequest = getHttpRequest(request);
  const config = {
    method: httpRequest.method,
    path: httpRequest.getFullUrl(params, options),
    headers: {
      'Content-Type': 'application/json'
    }
  };

  params = assign({}, params);

  if (request.params.$id) {
    delete params.$id;
  }

  config.params = prepareForQueryString(params);

  if (hasBody(httpRequest)) {
    config.entity = data;
  }

  return xhr(config)
  .then(res => {
    return res.entity;
  }, res => {
    if (res.error) {
      throw res.error;
    } else if (res.status) {
      throw res.status;
    }
    throw res;
  });
}

function onPush() {
  // noop
}

export default {
  getHttpRequests,
  run,
  onPush
};
