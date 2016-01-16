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

export default (Component, {options = {}, queryParams = {}, queries = {}, mutations = {}} = {}) => {
  const displayName = getContainerName(Component);
  const queryRequests = getRequestsFromQueries(queries);
  const mutationRequests = getRequestsFromQueries(mutations);
  const initialRequestNames = queryRequests.map(({name}) => name);
  const initialState = assign({$pendingRequests: initialRequestNames}, getInitialStateFromRequests(queryRequests));

  return React.createClass({
    displayName,

    getInitialState() {
      return initialState;
    },

    componentWillMount() {
      this.queryParams = update(queryParams, {$merge: this.props});
      this.ee = eventEmitter();
      this.fetcher = data(options);
      this.unregister = this.fetcher.onReceive(this.onReceive);
    },

    componentDidMount() {
      this.fetch(queryRequests);
    },

    componentWillReceiveProps(nextProps) {
      this.setQueryParams(nextProps);
    },

    shouldComponentUpdate(nextProps, nextState) {
      if (nextState.$pendingRequests.length) {
        return false;
      }
      return Object.keys(nextProps).some(key => nextProps[key] !== this.props[key]) ||
             Object.keys(nextState).some(key => nextState[key] !== this.state[key]);
    },

    componentWillUnmount() {
      this.ee = undefined;
      this.unregister();
    },

    onReceive({request, data: requestData}) {
      if (this.isMounted && !this.isMounted()) {
        return;
      }
      const i = this.state.$pendingRequests.indexOf(request.name);
      const newState = {[request.name]: {$set: requestData}};
      if (i !== -1) {
        newState.$pendingRequests = {$splice: [[i, 1]]};
      }
      this.setState(update(this.state, newState));
    },

    fetch(requests, opt = {}) {
      requests.forEach(request => {
        const params = setParamValues(request.params, this.queryParams);
        this.fetcher.fetch({request, params, options: opt});
      });
    },

    mutate(request, requestData) {
      const qp = assign({}, this.queryParams, requestData);
      const params = setParamValues(request.params, qp);
      this.fetcher.run({request, params, data: requestData, options});
    },

    setQueryParams(newParams) {
      const paramNames = getParamNames(newParams);
      const requestsToRedo = queryRequests.filter(request => paramNames.some(name => request.paramDependencies.indexOf(name) !== -1));
      this.queryParams = update(this.queryParams, {$merge: newParams});
      if (requestsToRedo.length) {
        this.setState(update(this.state, {
          $pendingRequests: {
            $push: requestsToRedo
              .filter(({name}) => this.state.$pendingRequests.indexOf(name) === -1)
              .map(({name}) => name)
          }
        }));
      }
      this.fetch(requestsToRedo, {force: true});
    },

    render() {
      this.ee.emit('render');

      if (this.state.$pendingRequests.length) {
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
