import isPojo from 'is-pojo';

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

  for (const p in PROP_TO_TYPE) {
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
  }, {});
}

function getParamValue(name, values) {
  return name.split(/\./g).reduce((value, key) => value[key], values);
}

function setParamValue(val, queryParams) {
  if (typeof val === 'string' && isQueryParam(val)) {
    return getParamValue(val.slice(1, -1), queryParams);
  }
  return val;
}

function setParamValues(declarationParams, queryParams) {
  if (isPojo(declarationParams)) {
    return Object.keys(declarationParams).reduce((params, key) => {
      params[key] = setParamValues(declarationParams[key], queryParams);
      return params;
    }, {});
  } else if (Array.isArray(declarationParams)) {
    return declarationParams.map(val => setParamValues(val, queryParams));
  }
  return setParamValue(declarationParams, queryParams);
}

function getParamNames(obj, parentKey) {
  return Object.keys(obj).reduce((result, key) => {
    const nestedKey = `${parentKey ? `${parentKey}.` : ''}${key}`;
    if (obj[key] !== null && typeof obj[key] === 'object') {
      result.push(...getParamNames(obj[key], nestedKey));
    } else {
      result.push(nestedKey);
    }
    return result;
  }, []);
}

export {
  getContainerName,
  getRequestsFromQueries,
  getInitialStateFromRequests,
  setParamValues,
  getParamNames
};
