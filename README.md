Relä
=====

> A [Relay](http://facebook.github.io/react/blog/2015/02/20/introducing-relay-and-graphql.html) inspired library for [React](https://facebook.github.io/react/index.html) and RESTful backends

"Relä" is the Swedish word for "Relay".

## Installation

You'll need both React and Relä:

`npm install --save react relae`


## Usage

Create a React component and wrap it using the `createContainer` function:

```javascript
import React from 'react';
import Relä from 'relae';

class MyComponent extends React.Component {
  render() {
    const data = this.props.data;
    return <div>{JSON.stringify(data)}</div>;
  }
}

export default Relä.createContainer(MyComponent, /* `Container Configuration` goes here */);
```

## Container Configuration

**Type:** `Object`


### Key `options`

Specifies optional options that are passed to the communication adapter.


```javascript
{
  options: {
    // Relä options here...
  }
}
```

#### Option `baseUrl`

**Type:** `String`

**Example:**

```javascript
{
  options: {
    baseUrl: "http://the.location.of/your/rest/api"
  }
}
```

### Key `queries`

**Type:** `Object`

Specifies what data to fetch before rendering the wrapped component.

A query consists of three parts: a name, a path and a filter:

```javascript
{
  queries: {
    name: {path: {/* filter */}}
  }
}
```

The `name` is the name of the `props` property to be set for the wrapped component with the data from the query result. The `path` is the resource path in your API, e.g. having `baseUrl = "http://localhost"` and `path = "item"` would give the full resource URL: `"http://localhost/item"`. See below about [`filter`](#filter).

### Key `queryParams`

**Type:** `Object`

The `queryParams` object is merged with the created Relä container's `props` and then passed to the query filters, see [more on filter params](#filter) below.

**Example:**

```javascript
{
  queryParams: {
    page: 1
  }
}
```

### Key `mutations`

**Type:** `Object`

Specifies what mutative actions a wrapped component can do, the syntax is similar to that of queries but also specifies a mutation type:

```javascript
{
  mutations: {
    name: {path: {type: {/* filter */}}
  }
}
```

The `name` of the action is used to create a mutation function that's passed to the wrapped component as `props`. The `path` is the resource path in the API, see [`queries`](#key-queries) above. `type` can be any of `$create` (makes a POST request), `$update` (PUT request) and `$delete` (DELETE request). See below about [`filter`](#filter).

## API

### `Relae.createContainer(Component, config)`

| Parameter | Type | Description |
|-----------|------|-------------|
| Component | `React.Component` | The component to wrap with a Relä container |
| config | `Object` | [The container configuration](#container-configuration) |


Wraps a React component with a Relä container, to get all the Relä goodness.


### `Relae.dump()`

Returns a JSON stringified dump of all the data in the internal store. Can be used in conjunction with [`Relae.boostrap()`](#relaebootstrapdata).


### `Relae.bootstrap(data)`

| Parameter | Type | Description |
|-----------|------|-------------|
| data | `String` | JSON stringified data |


Fills the internal store with the provided data. Should be used in conjunction with [`Relae.dump()`](#relaedump).


### `Relae.setIdProperty(name)`

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| name | `String` | The name of the `id` property to use | `"id"` |


Relä identifies objects in a collection by its id property, which defaults to `"id"`. If you're using Relä with e.g. MongoDB you should set this to `"_id"` with: `Relae.setIdProperty('_id')`.


### `Relae.onChange(listener)`

| Parameter | Type | Description |
|-----------|------|-------------|
| listener | `Function` | The function which will be triggered when the internal store changes |


Registers listeners that are triggered when the internal store is changed.


## Filter

The `filter` is a MongoDB like filter that's passed as a query string to the API (for GET and DELETE requests), it's also used to query the internal cache store using [sift](https://www.npmjs.com/package/sift).

**Example:**

```javascript
{
  options: {
    baseUrl: "http://localhost"
  },
  queries: {
    items: {items: {parentItemId: {$exists: false}}}
  }
}
```

A container configuration like that would make a `GET http://localhost/items?parentItemId={$exists:false}` request and set `props.item` to the result of the request for the wrapped component.

### Filter parameters

A filter can also contain parameters, using the `<param-name>` syntax:

```javascript
{
  options: {
    baseUrl: "http://localhost"
  },
  queryParams: {
    page: 1
  },
  queries: {
    items: {items: {page: '<page>', parentItemId: '<parentItemId>'}}
  }
}
```

Because only `page` is specified in the `queryParams` object the `parentItemId` must be provided using props to the Relä container, i.e:

```javascript
class ItemList extends React.Component {
  render() {
    return <ul>{this.props.items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
  }
}

let ItemListCntainer = Relä.createContainer(ItemList, /* configuration from above */);

React.render(<ItemListContainer parentItemId={2} />, document);
```

Which would then trigger a `GET http://localhost/items?page=1&parentItemId=2` request.

#### Nested filter parameters

Getting parameter values from nested `queryParams` or `props` can be done using dot notation, e.g. `<parent.id>` will search in `queryParams.parent.id` or `props.parent.id`.


### More examples

Have a look at the tests for now...


### Work in progress - TODO

- [x] Cache request data in a universal store to not make unnecessary requests
- [x] Add `setQueryParams` method to retrigger dependent requests
- [ ] More usage examples
- [ ] Make sure the components are updated optimistically for mutative actions
- [ ] Handle errors and maybe retries in a good way
- [ ] Work more on the isomorphism of the module (using the `dump` and `bootstrap` functions)
- [ ] Intelligently group similar requests together to minimize number of requests
- [ ] Extract Relä REST adapter to own module
- [ ] Create a Relä Websockets adapter

### License

MIT
