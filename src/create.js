import React from 'react';
import update from 'react/lib/update';
import assign from 'object-assign';
import eventEmitter from 'event-emitter';
import * as store from './store';
import rest from './rest';
import {getContainerName, getRequestsFromQueries, getInitialStateFromRequests, setParamValues} from './utils';

const STATES = {
  PENDING: 'PENDING',
  DONE: 'DONE'
};

export default (Component, containerOptions) => {
  containerOptions = assign({}, containerOptions);
  let queryParams = assign({}, containerOptions.queryParams);
  const options = assign({}, containerOptions.options);
  const queries = assign({}, containerOptions.queries);
  const mutations = assign({}, containerOptions.mutations);
  const displayName = getContainerName(Component);
  const queryRequests = getRequestsFromQueries(queries);
  const mutationRequests = getRequestsFromQueries(mutations);
  const initialState = assign({$containerState: STATES.PENDING}, getInitialStateFromRequests(queryRequests));

  return React.createClass({
    displayName,

    getInitialState() {
      return initialState;
    },

    componentWillMount() {
      this.ee = eventEmitter();
      this.fetch(queryRequests);
    },

    componentDidMount() {
      this.unregister = store.onChange(this.onStoreChange);
    },

    componentWillUnmount() {
      this.ee = undefined;
      this.unregister();
    },

    onStoreChange(collection) {
      if (this.isMounted && !this.isMounted()) {
        return;
      }
      const qp = assign({}, queryParams, this.props);
      queryRequests.filter(request => request.collection === collection)
        .forEach(request => {
          const params = setParamValues(request.params, qp);
          this.setState({[request.name]: store.getRequestData(request, params)});
        });
    },

    fetch(requests, opt) {
      const qp = assign({}, queryParams, this.props);
      Promise.all(requests.map(request => {
        const params = setParamValues(request.params, qp);
        if (!opt || !opt.force) {
          const existingData = store.getRequestData(request, params);
          if (existingData) {
            return this.setState({[request.name]: existingData});
          }
        }
        return rest.run({request, params, options})
          .then(data => {
            return store.setRequestData(request, params, data);
          })
          .catch((err) => {
            // FIXME: real error handling
            console.error(err);
          });
      }))
      .then(() => this.setState({$containerState: STATES.DONE}));
    },

    mutate(request) {
      const qp = assign({}, queryParams, this.props);
      const params = setParamValues(request.params, qp);
      rest.run({request, params, options})
        .then(data => store.setRequestData(request, params, data))
        .catch((err) => {
          // FIXME: real error handling
          console.error(err);
        });
    },

    setQueryParams(newParams) {
      const paramNames = Object.keys(newParams);
      const requestsToRedo = queryRequests.filter(request => paramNames.some(name => request.paramDependencies.indexOf(name) > -1));
      queryParams = update(queryParams, {$merge: newParams});
      this.fetch(requestsToRedo, {force: true});
    },

    render() {
      this.ee.emit('render');

      if (this.state.$containerState !== STATES.DONE) {
        return null;
      }

      const mutators = mutationRequests.reduce((mutatorProps, mutation) => {
        return assign({[mutation.name]: this.mutate.bind(this, mutation)}, mutatorProps);
      }, {});

      const setQueryParams = this.setQueryParams;

      const props = assign(
        {setQueryParams},
        this.props,
        this.state,
        mutators
      );

      return React.createElement(
        Component,
        props
      );
    }
  });
};
