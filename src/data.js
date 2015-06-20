import eventEmitter from 'event-emitter';
import assign from 'object-assign';
import rest from './rest';
import * as store from './store';

function fetcher(opts) {
  const ee = eventEmitter();

  let listeners = [];

  const getListener = (filter) => {
    for (let i = 0, len = listeners.length; i < len; i++) {
      if (filter(listeners[i])) {
        return listeners[i];
      }
    }
    return null;
  };

  const unregister = store.onChange((collection) => {
    const l = listeners.filter(({request}) => request.collection === collection);
    l.forEach(({request, params}) => {
      const data = store.getRequestData(request, params);
      if (data) {
        receive({request, params, data});
      }
    });
  });

  const receive = ({request, params, data}) => {
    ee.emit('receive', {request, params, data});
  };

  const change = ({request, params, data}) => {
    // receive({request, params, data});
    store.setRequestData(request, params, data);
  };

  const listen = (request, params) => {
    let listener = getListener(({request: req}) => req.name === request.name);
    if (listener) {
      listener.params = params;
      return;
    }
    listeners.push({request, params});
  };

  const fetch = ({request, params, data, options}) => {
    if (request.type === 'READ') {
      listen(request, params);
    }
    if (request.type === 'READ' && request.params.$id) {
      const existingData = store.getRequestData(request, params);
      if (existingData) {
        return receive({request, params, data: existingData});
      }
    } else if (request.type === 'UPDATE' || request.type === 'DELETE') {
      change({request, params, data});
    }
    rest.run({request, params, data, options: assign({}, opts, options)})
      .then(result => change({request, params, data: result}))
      .catch(err => {
        // FIXME: real error handling
        console.error(err);
      });
  };

  return {
    fetch,

    run({request, params, data, options}) {
      fetch({request, params, data, options: assign({}, options, {force: true})});
    },

    onReceive(cb) {
      ee.on('receive', cb);
      return () => {
        unregister();
        ee.off('receive', cb);
      };
    }
  };
}

export default fetcher;
