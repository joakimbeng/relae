/* eslint-env mocha */
/* eslint func-names:0 */
import React from 'react/addons';
import nock from 'nock';
import Relae from '../.';
import TestHelpers from 'react-test-helpers';

const {TestUtils, update} = React.addons;

const enc = val => encodeURIComponent(val);

function url(strings, ...values) {
  let result = '';
  for (let i = 0, len = strings.length; i < len; i++) {
    result += strings[i];
    if (typeof values[i] !== 'undefined') {
      result += enc(values[i]);
    }
  }
  return result;
}

describe('relae', () => {
  beforeEach(() => {
    Relae.bootstrap('{}');
  });

  afterEach(() => {
    TestHelpers.unmountComponents();
  });

  describe('queries', () => {
    beforeEach(function () {
      nock('http://localhost')
        .get('/items/1')
        .reply(200, {id: 1, title: 'My first item'});

      this.Item = TestHelpers.createEmittingComponent({
        displayName: 'Item',
        render() {
          const id = this.props.item.id;
          const title = this.props.item.title;
          return <div className="item">id: {id}, {title}</div>;
        }
      });
    });

    it('gets a single item using queryParams', function (done) {
      const ItemContainer = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://localhost'
        },
        queryParams: {
          itemId: 1
        },
        queries: {
          item: {items: {$id: '<itemId>'}}
        }
      });

      const container = TestHelpers.renderComponent(<ItemContainer />);

      this.Item.once('render', () => {
        const item = TestUtils.findRenderedDOMComponentWithTag(container, 'div');
        item.getDOMNode().textContent.should.equal('id: 1, My first item');
        done();
      });
    });

    it('gets a single item using nested queryParams', function (done) {
      const ItemContainer = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://localhost'
        },
        queryParams: {
          item: {
            id: 1
          }
        },
        queries: {
          item: {items: {$id: '<item.id>'}}
        }
      });

      const container = TestHelpers.renderComponent(<ItemContainer />);

      this.Item.once('render', () => {
        const item = TestUtils.findRenderedDOMComponentWithTag(container, 'div');
        item.getDOMNode().textContent.should.equal('id: 1, My first item');
        done();
      });
    });

    it('gets a single item using props', function (done) {
      const ItemContainer = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://localhost'
        },
        queries: {
          item: {items: {$id: '<itemId>'}}
        }
      });

      const container = TestHelpers.renderComponent(<ItemContainer itemId={1} />);

      this.Item.once('render', () => {
        const item = TestUtils.findRenderedDOMComponentWithTag(container, 'div');
        item.getDOMNode().textContent.should.equal('id: 1, My first item');
        done();
      });
    });

    it('gets a single item using nested props', function (done) {
      const ItemContainer = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://localhost'
        },
        queries: {
          item: {items: {$id: '<item.id>'}}
        }
      });

      const container = TestHelpers.renderComponent(<ItemContainer item={{id: 1}} />);

      this.Item.once('render', () => {
        const item = TestUtils.findRenderedDOMComponentWithTag(container, 'div');
        item.getDOMNode().textContent.should.equal('id: 1, My first item');
        done();
      });
    });

    it('can set query params to retrigger data fetch', function (done) {
      nock('http://localhost')
        .get(url`/items?parentId=1&${'$limit'}=2&${'$skip'}=0`)
        .reply(200, [
          {id: 11, title: 'Sub item 1', parentId: 1},
          {id: 12, title: 'Sub item 2', parentId: 1}
        ]);

      nock('http://localhost')
        .get(url`/items?parentId=1&${'$limit'}=2&${'$skip'}=2`)
        .reply(200, [
          {id: 13, title: 'Sub item 3', parentId: 1},
          {id: 14, title: 'Sub item 4', parentId: 1}
        ]);

      const Item = this.Item;

      const ParentItem = TestHelpers.createEmittingComponent({
        displayName: 'ParentItem',

        nextPage() {
          this.props.setQueryParams({skip: 2});
        },

        render() {
          return (
            <div>
              {this.props.items.map((item, i) => <Item key={i} item={item} />)}
              <button className="next-button" onClick={this.nextPage}>Next page</button>
            </div>
          );
        }
      });

      const ParentItemContainer = Relae.createContainer(ParentItem, {
        options: {
          baseUrl: 'http://localhost'
        },
        queryParams: {
          limit: 2,
          skip: 0
        },
        queries: {
          items: {items: {parentId: 1, $limit: '<limit>', $skip: '<skip>'}}
        }
      });

      const container = TestHelpers.renderComponent(<ParentItemContainer />);

      ParentItem.once('render', () => {
        let items = TestUtils.scryRenderedDOMComponentsWithClass(container, 'item');
        items.length.should.equal(2);
        items[0].getDOMNode().textContent.should.equal('id: 11, Sub item 1');
        items[1].getDOMNode().textContent.should.equal('id: 12, Sub item 2');
        const button = TestUtils.findRenderedDOMComponentWithClass(container, 'next-button');
        ParentItem.once('render', () => {
          items = TestUtils.scryRenderedDOMComponentsWithClass(container, 'item');
          items.length.should.equal(2);
          items[0].getDOMNode().textContent.should.equal('id: 13, Sub item 3');
          items[1].getDOMNode().textContent.should.equal('id: 14, Sub item 4');
          done();
        });
        TestUtils.Simulate.click(button);
      });
    });

    it('can set nested query params to retrigger data fetch', function (done) {
      nock('http://localhost')
        .get(url`/items?parentId=1`)
        .reply(200, [
          {id: 11, title: 'Sub item 1', parentId: 1},
          {id: 12, title: 'Sub item 2', parentId: 1}
        ]);

      nock('http://localhost')
        .get(url`/items?parentId=2`)
        .reply(200, [
          {id: 13, title: 'Sub item 3', parentId: 2},
          {id: 14, title: 'Sub item 4', parentId: 2}
        ]);

      const Item = this.Item;

      const ParentItem = TestHelpers.createEmittingComponent({
        displayName: 'ParentItem',

        nextPage() {
          this.props.setQueryParams({parent: {id: 2}});
        },

        render() {
          return (
            <div>
              {this.props.items.map((item, i) => <Item key={i} item={item} />)}
              <button className="next-button" onClick={this.nextPage}>Next page</button>
            </div>
          );
        }
      });

      const ParentItemContainer = Relae.createContainer(ParentItem, {
        options: {
          baseUrl: 'http://localhost'
        },
        queryParams: {
          parent: {id: 1}
        },
        queries: {
          items: {items: {parentId: '<parent.id>'}}
        }
      });

      const container = TestHelpers.renderComponent(<ParentItemContainer />);

      ParentItem.once('render', () => {
        let items = TestUtils.scryRenderedDOMComponentsWithClass(container, 'item');
        items.length.should.equal(2);
        items[0].getDOMNode().textContent.should.equal('id: 11, Sub item 1');
        items[1].getDOMNode().textContent.should.equal('id: 12, Sub item 2');
        const button = TestUtils.findRenderedDOMComponentWithClass(container, 'next-button');
        ParentItem.once('render', () => {
          items = TestUtils.scryRenderedDOMComponentsWithClass(container, 'item');
          items.length.should.equal(2);
          items[0].getDOMNode().textContent.should.equal('id: 13, Sub item 3');
          items[1].getDOMNode().textContent.should.equal('id: 14, Sub item 4');
          done();
        });
        TestUtils.Simulate.click(button);
      });
    });

    it('does not crash for not set $id query parameter', function (done) {
      const badRequest = nock('http://localhost')
        .get('/items/null')
        .reply(400);

      const ItemContainer = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://localhost'
        },
        queries: {
          item: {items: {$id: '<itemId>'}}
        }
      });

      TestHelpers.renderComponent(<ItemContainer />);

      this.Item.once('render', () => {
        done(new Error('An item should not be rendered!'));
      });

      setTimeout(() => {
        try {
          badRequest.done();
          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it('does not crash for filter with NULL values (Issue #1)', function (done) {
      nock('http://localhost')
        .get('/items/3?parentId=null')
        .reply(200, {id: 3, title: 'My first non-parent item', parentId: null});

      const ItemContainer = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://localhost'
        },
        queries: {
          item: {items: {$id: '<itemId>', parentId: null}}
        }
      });

      const container = TestHelpers.renderComponent(<ItemContainer itemId={3} />);

      this.Item.once('render', () => {
        const item = TestUtils.findRenderedDOMComponentWithTag(container, 'div');
        item.getDOMNode().textContent.should.equal('id: 3, My first non-parent item');
        done();
      });
    });

    it('does not set `props` properties to strings when not finding a resource (Issue #2)', function () {
      nock('http://localhost')
        .get('/items/4')
        .reply(404);

      const ItemContainer = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://localhost'
        },
        queries: {
          item: {items: {$id: '<itemId>'}}
        }
      });

      const container = TestHelpers.renderComponent(<ItemContainer itemId={4} />);
      const items = TestUtils.scryRenderedDOMComponentsWithTag(container, 'div');

      items.length.should.equal(0);
    });

    it('does not send `[object Object]` as query parameter content (Issue #3)', function (done) {
      nock('http://localhost')
        .get(url`/items/4?parentId=${'{"$eq":2}'}`)
        .reply(200, {id: 4, parentId: 2, title: 'An item'});

      const ItemContainer = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://localhost'
        },
        queries: {
          item: {items: {$id: '<itemId>', parentId: {$eq: 2}}}
        }
      });

      const container = TestHelpers.renderComponent(<ItemContainer itemId={4} />);

      this.Item.once('render', () => {
        const items = TestUtils.scryRenderedDOMComponentsWithTag(container, 'div');
        items.length.should.equal(1);
        done();
      });
    });

    it('does use `baseUrl` option (Issue #4)', function (done) {
      nock('http://remotehost')
        .get(url`/items/1`)
        .reply(200, {id: 1, title: 'An item'});

      const ItemContainer = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://remotehost'
        },
        queries: {
          item: {items: {$id: '<itemId>'}}
        }
      });

      const container = TestHelpers.renderComponent(<ItemContainer itemId={1} />);

      this.Item.once('render', () => {
        const items = TestUtils.scryRenderedDOMComponentsWithTag(container, 'div');
        items.length.should.equal(1);
        items[0].getDOMNode().textContent.should.equal('id: 1, An item');
        done();
      });
    });

    it('does not overwrite a whole collection in the store for different filters', function (done) {
      nock('http://localhost')
        .get(`/items?parentId=1`)
        .reply(200, [
          {id: 1, parentId: 1, title: 'Item 1.1'},
          {id: 2, parentId: 1, title: 'Item 1.2'}
        ]);
      nock('http://localhost')
        .get(`/items?parentId=2`)
        .reply(200, [
          {id: 3, parentId: 2, title: 'Item 2.1'},
          {id: 4, parentId: 2, title: 'Item 2.2'}
        ]);

      const Item = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://localhost'
        },
        queries: {
          item: {items: {$id: '<itemId>'}}
        }
      });

      const ItemList = TestHelpers.createEmittingComponent({
        displayName: 'ItemList',
        render() {
          return (
            <div>
              {this.props.items.map((item, i) => <Item key={i} itemId={item.id} />)}
            </div>
          );
        }
      });

      const ItemListContainer = Relae.createContainer(ItemList, {
        options: {
          baseUrl: 'http://localhost'
        },
        queries: {
          items: {items: {parentId: '<parentId>'}}
        }
      });

      const instance = TestHelpers.renderComponent((
        <div>
          <ItemListContainer className="item-list-1" parentId={1} />
          <ItemListContainer className="item-list-2" parentId={2} />
        </div>
      ));

      ItemList.once('render', () => {
        const items = TestUtils.scryRenderedComponentsWithType(instance, Item);
        items.map(item => item.getDOMNode().textContent).should.eql([
          'id: 1, Item 1.1',
          'id: 2, Item 1.2',
          'id: 3, Item 2.1',
          'id: 4, Item 2.2'
        ]);
        done();
      });
    });
  });

  describe('mutations', () => {
    beforeEach(function () {
      nock('http://localhost')
        .get('/stories')
        .reply(200, [{id: 1, title: 'My first post'}]);

      const Story = this.Story = TestHelpers.createEmittingComponent({
        displayName: 'Story',

        onTitleChange(e) {
          this.props.updateStory(update(this.props.story, {title: {$set: e.target.value}}));
        },

        removeStory() {
          this.props.removeStory();
        },

        render() {
          return (
            <div className="story">
              <input className="title-input" onChange={this.onTitleChange} type="text" value={this.props.story.title} />
              <button className="remove-button" onClick={this.removeStory}>Remove</button>
            </div>
          );
        }
      });

      const StoryContainer = this.StoryContainer = Relae.createContainer(Story, {
        options: {
          baseUrl: 'http://localhost'
        },
        queries: {
          story: {stories: {$id: '<storyId>'}}
        },
        mutations: {
          updateStory: {stories: {$update: {$id: '<storyId>'}}},
          removeStory: {stories: {$delete: {$id: '<storyId>'}}}
        }
      });

      const StoryList = this.StoryList = TestHelpers.createEmittingComponent({
        displayName: 'StoryList',

        addStory() {
          this.props.addStory({title: 'My second post'});
        },

        render() {
          return (
            <div>
              {this.props.stories.map((story, i) => <StoryContainer storyId={story.id} key={i} />)}
              <button className="add-button" onClick={this.addStory}>Add story</button>
            </div>
          );
        }
      });

      this.StoryListContainer = Relae.createContainer(StoryList, {
        options: {
          baseUrl: 'http://localhost'
        },
        queries: {
          stories: {stories: {}}
        },
        mutations: {
          addStory: {stories: {$create: {}}}
        }
      });
    });

    it('can do $create actions', function (done) {
      nock('http://localhost')
        .post('/stories')
        .reply(201, {id: 2, title: 'My second post'});

      const StoryList = this.StoryListContainer;

      const container = TestHelpers.renderComponent(<StoryList />);

      this.StoryList.once('render', () => {
        const button = TestUtils.findRenderedDOMComponentWithClass(container, 'add-button');
        this.StoryList.once('render', () => {
          const stories = TestUtils.scryRenderedComponentsWithType(container, this.StoryContainer);
          stories.length.should.equal(2);
          done();
        });
        TestUtils.Simulate.click(button);
      });
    });

    it('posts provided data for $create actions (Fixes #5)', function (done) {
      nock('http://localhost')
        .post('/stories', {title: 'My second post'})
        .reply(201, {id: 2, title: 'My second post'});

      const StoryList = this.StoryListContainer;

      const container = TestHelpers.renderComponent(<StoryList />);

      this.StoryList.once('render', () => {
        const button = TestUtils.findRenderedDOMComponentWithClass(container, 'add-button');
        this.StoryList.once('render', () => {
          const stories = TestUtils.scryRenderedComponentsWithType(container, this.StoryContainer);
          stories.length.should.equal(2);
          done();
        });
        TestUtils.Simulate.click(button);
      });
    });

    it('can do $update actions', function (done) {
      nock('http://localhost')
        .put('/stories/1')
        .reply(201, {id: 1, title: 'My changed post'});

      const StoryList = this.StoryListContainer;

      const container = TestHelpers.renderComponent(<StoryList />);

      this.StoryList.once('render', () => {
        const stories = TestUtils.scryRenderedComponentsWithType(container, this.StoryContainer);
        const input = TestUtils.findRenderedDOMComponentWithClass(stories[0], 'title-input');
        this.Story.once('render', () => {
          input.getDOMNode().value.should.equal('My changed post');
          done();
        });
        TestUtils.Simulate.change(input, {target: {value: 'My changed post'}});
      });
    });

    it('can do $delete actions', function (done) {
      nock('http://localhost')
        .delete('/stories/1')
        .reply(204);

      const StoryList = this.StoryListContainer;

      const container = TestHelpers.renderComponent(<StoryList />);

      this.Story.on('render', () => {
        let stories = TestUtils.scryRenderedDOMComponentsWithClass(container, 'story');
        const button = TestUtils.findRenderedDOMComponentWithClass(stories[0], 'remove-button');
        this.StoryList.once('render', () => {
          stories = TestUtils.scryRenderedDOMComponentsWithClass(container, 'story');
          stories.length.should.equal(0);
          done();
        });
        TestUtils.Simulate.click(button);
      });
    });

    it('uses provided data as query parameters', done => {
      const deleteRequest = nock('http://localhost')
        .delete('/foobar/1')
        .reply(204);

      const FooBar = TestHelpers.createEmittingComponent({
        displayName: 'FooBar',

        onRemove() {
          this.props.remove({foobarId: 1});
        },

        render() {
          return <button className="remove-button" onClick={this.onRemove}>remove</button>;
        }
      });

      const FooBarContainer = Relae.createContainer(FooBar, {
        mutations: {
          remove: {foobar: {$delete: {$id: '<foobarId>'}}}
        }
      });

      const container = TestHelpers.renderComponent(<FooBarContainer />);

      const button = TestUtils.findRenderedDOMComponentWithClass(container, 'remove-button');

      TestUtils.Simulate.click(button);

      setTimeout(() => {
        try {
          deleteRequest.done();
          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });
  });

  describe('setIdProperty', () => {
    before(() => {
      Relae.setIdProperty('_id');
    });

    after(() => {
      Relae.setIdProperty('id');
    });

    beforeEach(function () {
      nock('http://my.host')
        .get('/items/1')
        .reply(200, {_id: 1, title: 'My item'});

      this.Item = TestHelpers.createEmittingComponent({
        displayName: 'Item',
        render() {
          const id = this.props.item._id;
          const title = this.props.item.title;
          return <div className="item">id: {id}, {title}</div>;
        }
      });
    });

    it('uses the set id property when getting data', function (done) {
      const ItemContainer = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://my.host'
        },
        queryParams: {
          itemId: 1
        },
        queries: {
          item: {items: {$id: '<itemId>'}}
        }
      });

      const container = TestHelpers.renderComponent(<ItemContainer />);

      this.Item.once('render', () => {
        const item = TestUtils.findRenderedDOMComponentWithTag(container, 'div');
        item.getDOMNode().textContent.should.equal('id: 1, My item');
        done();
      });
    });
  });
});
