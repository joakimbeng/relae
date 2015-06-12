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
    method: TYPES_TO_METHOD[queryRequest.type]
  };
}

function getHttpRequests(queryRequests) {
  return queryRequests.map(getHttpRequest);
}

function hasBody(request) {
  return BODY_METHODS.indexOf(request.method) > -1;
}

function run({request, params, options}) {
  request = getHttpRequest(request);
  const url = params.$id ? request.url.replace('<$id>', params.$id) : request.url;
  const baseUrl = options.baseUrl || null;

  let data = assign({}, params);

  if (params.$id) {
    delete data.$id;
  }

  return xhr({
    method: request.method,
    baseUrl: baseUrl,
    path: url,
    headers: {
      'Content-Type': 'application/json'
    },
    [hasBody(request) ? 'entity' : 'params']: data
  })
  .then((res) => {
    // console.log(res);
    return res.entity;
  }, ({status}) => {
    throw status;
  });
}

function onPush() {
  // noop
}

let rest = {
  getHttpRequests,
  run,
  onPush
};

export default rest;
