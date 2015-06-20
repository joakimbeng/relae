import update from 'react/lib/update';
import sift from 'sift';
import eventEmitter from 'event-emitter';

let idProperty = 'id';

sift.useOperator('id', (a, b) => a === b[idProperty]);
sift.useOperator('limit', () => true);
sift.useOperator('skip', () => true);

const ee = eventEmitter();

let storage = {};

function setState(state) {
  storage = update(storage, {$merge: state});
  Object.keys(state).forEach((key) => ee.emit('change', key));
}

function getRequestData(request, params) {
  const collection = storage[request.collection] || [];
  let data = sift(params, collection);
  if (request.params.$id) {
    return data && data[0];
  }
  if (params.$skip || params.$limit) {
    const skip = params.$skip || 0;
    const limit = params.$limit ? skip + params.$limit : null;
    data = data.slice(skip, limit);
  }
  return data;
}

function setRequestData(request, params, data) {
  const collection = storage[request.collection] || [];
  let newState;
  if (request.params.$id) {
    let i = sift.indexOf(params, collection);
    if (i > -1) {
      newState = update(collection, {$splice: [request.type === 'DELETE' ? [i, 1] : [i, 1, data]]});
    } else if (request.type !== 'DELETE') {
      newState = update(collection, {$push: [data]});
    }
  } else if (Array.isArray(data)) {
    newState = update(collection, {$push: data.filter(item => sift.indexOf({$id: item[idProperty]}, collection) < 0)});
  } else {
    newState = update(collection, {$push: [data]});
  }
  if (newState) {
    setState({[request.collection]: newState});
  }
  return data;
}

function onChange(listener) {
  ee.on('change', listener);
  return function unregister() {
    ee.off('change', listener);
  };
}

function bootstrap(data) {
  storage = JSON.parse(data);
}

function dump() {
  return JSON.stringify(storage);
}

function setIdProperty(name) {
  idProperty = name;
}

export {
  bootstrap,
  dump,
  setState,
  getRequestData,
  setRequestData,
  setIdProperty,
  onChange
};
