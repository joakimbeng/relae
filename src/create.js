import React from 'react';
import assign from 'object-assign';
import * as store from './store';
import rest from './rest';
import {getContainerName, getRequestsFromQueries, getInitialStateFromRequests, setParamValues} from './utils';

export default (Component, containerOptions) => {
  containerOptions = assign({}, containerOptions);
  const options = assign({}, containerOptions.options);
  const queryParams = assign({}, containerOptions.queryParams);
  const queries = assign({}, containerOptions.queries);
  const mutations = assign({}, containerOptions.mutations);
  const displayName = getContainerName(Component);
  const requests = getRequestsFromQueries(queries);
  const mutationRequests = getRequestsFromQueries(mutations);
  const initialState = getInitialStateFromRequests(requests);

  return React.createClass({
    displayName,

    getInitialState() {
      return initialState;
    },

    componentWillMount() {
      const qp = assign({}, queryParams, this.props);
      Promise.all(requests.map(request => {
        const params = setParamValues(request.params, qp);
        const existingData = store.getRequestData(request, params);
        if (existingData) {
          return this.setState({[request.name]: existingData});
        }
        return rest.run({request, params, options})
          .then(data => store.setRequestData(request, params, data))
          .then(data => this.setState({[request.name]: data}))
          .catch((err) => {
            // FIXME: real error handling
            console.error(err);
          });
      }))
      .then(() => this.setState({$containerLoading: false}));
    },

    componentDidMount() {
      this.unregister = store.onChange(this.onStoreChange);
    },

    componentWillUnmount() {
      this.unregister();
    },

    onStoreChange(collection) {
      if (this.isMounted && !this.isMounted()) {
        return;
      }
      const qp = assign({}, queryParams, this.props);
      requests.filter(request => request.collection === collection)
        .forEach(request => {
          const params = setParamValues(request.params, qp);
          this.setState({[request.name]: store.getRequestData(request, params)});
        });
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

    render() {
      if (this.state.$containerLoading) {
        return null;
      }

      const mutators = mutationRequests.reduce((mutatorProps, mutation) => {
        return assign({[mutation.name]: this.mutate.bind(this, mutation)}, mutatorProps);
      }, {});

      const props = assign(
        {},
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
