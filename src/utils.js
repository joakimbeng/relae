const DEFAULT_TYPE = 'READ';
const PROP_TO_TYPE = {
  $create: 'CREATE',
  $update: 'UPDATE',
  $delete: 'DELETE'
};

function getContainerName(Component) {
  return `${Component.displayName || Component.name}Container`;
}

function getTypeAndParams(declarationParams) {
  let params = declarationParams || {};
  let type = DEFAULT_TYPE;

  for (let p in PROP_TO_TYPE) {
    if (params[p]) {
      params = params[p];
      type = PROP_TO_TYPE[p];
      break;
    }
  }

  return {type, params};
}

function isQueryParam(val) {
  return typeof val === 'string' && val[0] === '<' && val[val.length - 1] === '>';
}

function getQueryParamDependencies(params) {
  return Object.keys(params).reduce((dependencies, key) => {
    if (isQueryParam(params[key])) {
      return dependencies.concat(params[key].slice(1, -1));
    }
    return dependencies;
  }, []);
}

function getInitialStateFromRequest({params}) {
  return params.$id ? {} : [];
}

function getRequestFromQuery(name, query) {
  const collections = Object.keys(query);

  if (collections.length === 0) {
    throw new Error(`Missing collection name in query with name: "${name}"!`);
  } else if (collections.length > 1) {
    throw new Error(`Too many collection names in query with name: "${name}"! There can be only one collection per query!`);
  }

  const collection = collections[0];
  const {type, params} = getTypeAndParams(query[collection]);
  const paramDependencies = getQueryParamDependencies(params);

  return {name, collection, type, params, paramDependencies};
}

function getRequestsFromQueries(queries) {
  const propertyNames = Object.keys(queries);

  return propertyNames.map(property => {
    const query = queries[property];
    return getRequestFromQuery(property, query);
  });
}

function getInitialStateFromRequests(requests) {
  return requests.reduce((state, request) => {
    state[request.name] = getInitialStateFromRequest(request);
    return state;
  }, {$containerLoading: true});
}

function setParamValues(declarationParams, queryParams) {
  return Object.keys(declarationParams).reduce((params, key) => {
    if (isQueryParam(declarationParams[key])) {
      params[key] = queryParams[declarationParams[key].slice(1, -1)];
    } else if (declarationParams[key] !== null && typeof declarationParams[key] === 'object') {
      params[key] = setParamValues(declarationParams[key], queryParams);
    } else {
      params[key] = declarationParams[key];
    }
    return params;
  }, {});
}

export {
  getContainerName,
  getRequestsFromQueries,
  getInitialStateFromRequests,
  setParamValues
};
