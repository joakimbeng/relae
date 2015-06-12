import update from 'react/lib/update';
import sift from 'sift';
import eventEmitter from 'event-emitter';

sift.useOperator('id', (a, b) => a === b.id);

const ee = eventEmitter();

let storage = {};

function setState(state) {
  storage = update(storage, {$merge: state});
  Object.keys(state).forEach((key) => ee.emit('change', key));
}

function getRequestData(request, params) {
  const collection = storage[request.collection] || [];
  const data = sift(params, collection);
  if (params.$id) {
    return data && data[0];
  }
  return data.length ? data : null;
}

function setRequestData(request, params, data) {
  const collection = storage[request.collection] || [];
  let newState;
  if (params.$id) {
    let i = sift.indexOf(params, collection);
    if (i > -1) {
      newState = update(collection, {$splice: [request.type === 'DELETE' ? [i, 1] : [i, 1, data]]});
    } else {
      newState = update(collection, {$push: [data]});
    }
  } else if (Array.isArray(data)) {
    newState = data;
  } else {
    newState = update(collection, {$push: [data]});
  }
  setState({[request.collection]: newState});
  return data;
}

function onChange(listener) {
  ee.on('change', listener);
  return function unregister() {
    ee.off('change', listener);
  };
}

function bootstrap(data) {
  setState(JSON.parse(data));
}

function dump() {
  return JSON.stringify(storage);
}

export {
  bootstrap,
  dump,
  setState,
  getRequestData,
  setRequestData,
  onChange
};
