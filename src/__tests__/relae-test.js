/* eslint-env mocha */
/* eslint func-names:0 */
/* globals sinon */
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

describe('relae', function () {
  beforeEach(function () {
    Relae.bootstrap('{}');
  });

  afterEach(function () {
    TestHelpers.unmountComponents();
  });

  describe('queries', function () {
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
      let ItemContainer = Relae.createContainer(this.Item, {
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

      let container = TestHelpers.renderComponent(<ItemContainer />);

      this.Item.once('render', () => {
        let item = TestUtils.findRenderedDOMComponentWithTag(container, 'div');
        item.getDOMNode().textContent.should.equal('id: 1, My first item');
        done();
      });
    });

    it('gets a single item using props', function (done) {
      let ItemContainer = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://localhost'
        },
        queries: {
          item: {items: {$id: '<itemId>'}}
        }
      });

      let container = TestHelpers.renderComponent(<ItemContainer itemId={1} />);

      this.Item.once('render', () => {
        let item = TestUtils.findRenderedDOMComponentWithTag(container, 'div');
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

      let Item = this.Item;

      let ParentItem = TestHelpers.createEmittingComponent({
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

      let ParentItemContainer = Relae.createContainer(ParentItem, {
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

      let container = TestHelpers.renderComponent(<ParentItemContainer />);

      ParentItem.once('render', () => {
        let items = TestUtils.scryRenderedDOMComponentsWithClass(container, 'item');
        items.length.should.equal(2);
        items[0].getDOMNode().textContent.should.equal('id: 11, Sub item 1');
        items[1].getDOMNode().textContent.should.equal('id: 12, Sub item 2');
        let button = TestUtils.findRenderedDOMComponentWithClass(container, 'next-button');
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

    it('does not crash for filter with NULL values (Issue #1)', function (done) {
      nock('http://localhost')
        .get('/items/3?parentId=null')
        .reply(200, {id: 3, title: 'My first non-parent item', parentId: null});

      let ItemContainer = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://localhost'
        },
        queries: {
          item: {items: {$id: '<itemId>', parentId: null}}
        }
      });

      let container = TestHelpers.renderComponent(<ItemContainer itemId={3} />);

      this.Item.once('render', () => {
        let item = TestUtils.findRenderedDOMComponentWithTag(container, 'div');
        item.getDOMNode().textContent.should.equal('id: 3, My first non-parent item');
        done();
      });
    });

    it('does not set `props` properties to strings when not finding a resource (Issue #2)', function () {
      nock('http://localhost')
        .get('/items/4')
        .reply(404);

      let ItemContainer = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://localhost'
        },
        queries: {
          item: {items: {$id: '<itemId>'}}
        }
      });

      let container = TestHelpers.renderComponent(<ItemContainer itemId={4} />);
      let items = TestUtils.scryRenderedDOMComponentsWithTag(container, 'div');

      items.length.should.equal(0);
    });

    it('does not send `[object Object]` as query parameter content (Issue #3)', function (done) {
      nock('http://localhost')
        .get(url`/items/4?parentId=${'{"$eq":2}'}`)
        .reply(200, {id: 4, parentId: 2, title: 'An item'});

      let ItemContainer = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://localhost'
        },
        queries: {
          item: {items: {$id: '<itemId>', parentId: {$eq: 2}}}
        }
      });

      let container = TestHelpers.renderComponent(<ItemContainer itemId={4} />);

      this.Item.once('render', () => {
        let items = TestUtils.scryRenderedDOMComponentsWithTag(container, 'div');
        items.length.should.equal(1);
        done();
      });
    });

    it('does use `baseUrl` option (Issue #4)', function (done) {
      nock('http://remotehost')
        .get(url`/items/1`)
        .reply(200, {id: 1, title: 'An item'});

      let ItemContainer = Relae.createContainer(this.Item, {
        options: {
          baseUrl: 'http://remotehost'
        },
        queries: {
          item: {items: {$id: '<itemId>'}}
        }
      });

      let container = TestHelpers.renderComponent(<ItemContainer itemId={1} />);

      this.Item.once('render', () => {
        let items = TestUtils.scryRenderedDOMComponentsWithTag(container, 'div');
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

      let Item = Relae.createContainer(this.Item, {
        options: { baseUrl: 'http://localhost' },
        queries: {
          item: {items: {$id: '<itemId>'}}
        }
      });

      let ItemList = TestHelpers.createEmittingComponent({
        displayName: 'ItemList',
        render() {
          return (
            <div>
              {this.props.items.map((item, i) => <Item key={i} itemId={item.id} />)}
            </div>
          );
        }
      });

      let ItemListContainer = Relae.createContainer(ItemList, {
        options: { baseUrl: 'http://localhost' },
        queries: {
          items: {items: {parentId: '<parentId>'}}
        }
      });

      let instance = TestHelpers.renderComponent((
        <div>
          <ItemListContainer className="item-list-1" parentId={1} />
          <ItemListContainer className="item-list-2" parentId={2} />
        </div>
      ));

      ItemList.once('render', () => {
        let items = TestUtils.scryRenderedComponentsWithType(instance, Item);
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

  describe('mutations', function () {
    beforeEach(function () {
      nock('http://localhost')
        .get('/stories')
        .reply(200, [{id: 1, title: 'My first post'}]);

      let Story = this.Story = TestHelpers.createEmittingComponent({
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

      let StoryContainer = this.StoryContainer = Relae.createContainer(Story, {
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

      let StoryList = this.StoryList = TestHelpers.createEmittingComponent({
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

      let StoryList = this.StoryListContainer;

      let container = TestHelpers.renderComponent(<StoryList />);

      this.StoryList.once('render', () => {
        let button = TestUtils.findRenderedDOMComponentWithClass(container, 'add-button');
        this.StoryList.once('render', () => {
          let stories = TestUtils.scryRenderedComponentsWithType(container, this.StoryContainer);
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

      let StoryList = this.StoryListContainer;

      let container = TestHelpers.renderComponent(<StoryList />);

      this.StoryList.once('render', () => {
        let button = TestUtils.findRenderedDOMComponentWithClass(container, 'add-button');
        this.StoryList.once('render', () => {
          let stories = TestUtils.scryRenderedComponentsWithType(container, this.StoryContainer);
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

      let StoryList = this.StoryListContainer;

      let container = TestHelpers.renderComponent(<StoryList />);

      this.StoryList.once('render', () => {
        let stories = TestUtils.scryRenderedComponentsWithType(container, this.StoryContainer);
        let input = TestUtils.findRenderedDOMComponentWithClass(stories[0], 'title-input');
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

      let StoryList = this.StoryListContainer;

      let container = TestHelpers.renderComponent(<StoryList />);

      this.Story.on('render', () => {
        let stories = TestUtils.scryRenderedDOMComponentsWithClass(container, 'story');
        let button = TestUtils.findRenderedDOMComponentWithClass(stories[0], 'remove-button');
        this.StoryList.once('render', () => {
          stories = TestUtils.scryRenderedDOMComponentsWithClass(container, 'story');
          stories.length.should.equal(0);
          done();
        });
        TestUtils.Simulate.click(button);
      });
    });
  });

  describe('setIdProperty', function () {
    before(function () {
      Relae.setIdProperty('_id');
    });

    after(function () {
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
      let ItemContainer = Relae.createContainer(this.Item, {
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

      let container = TestHelpers.renderComponent(<ItemContainer />);

      this.Item.once('render', () => {
        let item = TestUtils.findRenderedDOMComponentWithTag(container, 'div');
        item.getDOMNode().textContent.should.equal('id: 1, My item');
        done();
      });
    });
  });
});
