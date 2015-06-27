import React from 'react';
import update from 'react/lib/update';
import assign from 'object-assign';
import eventEmitter from 'event-emitter';
import data from './data';
import {
  getContainerName,
  getParamNames,
  getRequestsFromQueries,
  getInitialStateFromRequests,
  setParamValues
} from './utils';

const STATES = {
  PENDING: 'PENDING',
  DONE: 'DONE'
};

export default (Component, config = {}) => {
  let queryParams = assign({}, config.queryParams);
  const options = assign({}, config.options);
  const queries = assign({}, config.queries);
  const mutations = assign({}, config.mutations);
  const displayName = getContainerName(Component);
  const queryRequests = getRequestsFromQueries(queries);
  const mutationRequests = getRequestsFromQueries(mutations);
  const initialRequestNames = queryRequests.map(({name}) => name);
  const initialState = assign({$containerState: initialRequestNames.length ? STATES.PENDING : STATES.DONE}, getInitialStateFromRequests(queryRequests));

  return React.createClass({
    displayName,

    getInitialState() {
      return initialState;
    },

    componentWillMount() {
      this.initialRequestNames = initialRequestNames.slice(0);
      this.ee = eventEmitter();
      this.fetcher = data(options);
      this.unregister = this.fetcher.onReceive(this.onReceive);
    },

    componentDidMount() {
      this.fetch(queryRequests);
    },

    componentWillUnmount() {
      this.ee = undefined;
      this.unregister();
    },

    onReceive({request, data: newState}) {
      if (this.isMounted && !this.isMounted()) {
        return;
      }
      this.setState({[request.name]: newState});
      const requestNames = this.initialRequestNames.slice(0);
      let i = requestNames.indexOf(request.name);
      if (i > -1) {
        requestNames.splice(i, 1);
        if (!requestNames.length) {
          this.setState({$containerState: STATES.DONE});
        }
        this.initialRequestNames = requestNames;
      }
    },

    fetch(requests, opt) {
      const qp = assign({}, queryParams, this.props);
      requests.forEach(request => {
        const params = setParamValues(request.params, qp);
        this.fetcher.fetch({request, params, options: opt});
      });
    },

    mutate(request, requestData) {
      const qp = assign({}, queryParams, this.props, requestData);
      const params = setParamValues(request.params, qp);
      this.fetcher.run({request, params, data: requestData, options});
    },

    setQueryParams(newParams) {
      const paramNames = getParamNames(newParams);
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
