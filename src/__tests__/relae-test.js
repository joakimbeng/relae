/* eslint-env mocha */
/* eslint func-names:0 */
/* globals sinon */
import React from 'react/addons';
import nock from 'nock';
import Relae from '../.';
import * as TestHelpers from './test-helpers';

const {TestUtils, update} = React.addons;

describe('relae', function () {
  afterEach(function () {
    TestHelpers.unmountComponents();
  });

  describe('queries', function () {
    beforeEach(function () {
      nock('http://localhost')
        .get('/items/1')
        .reply(200, {id: 1, title: 'My first item'});

      this.Item = TestHelpers.createEmittingComponent('Item', {
        render() {
          const id = this.props.item.id;
          const title = this.props.item.title;
          return <div>id: {id}, {title}</div>;
        }
      });
    });

    it('gets single item using queryParams', function (done) {
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

    it('gets single item using props', function (done) {
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
  });

  describe('mutations', function () {
    beforeEach(function () {
      nock('http://localhost')
        .get('/stories')
        .reply(200, [{id: 1, title: 'My first post'}]);

      let Story = this.Story = TestHelpers.createEmittingComponent('Story', {
        onTitleChange(e) {
          this.props.updateStory(update(this.props.story, {title: {$set: e.target.value}}));
        },

        removeStory() {
          this.props.removeStory();
        },

        render() {
          return (
            <div className="story">
              <input onChange={this.onTitleChange} type="text" value={this.props.story.title} />
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

      let StoryList = this.StoryList = TestHelpers.createEmittingComponent('StoryList', {
        render() {
          return (
            <div>
              {this.props.stories.map((story, i) => <StoryContainer storyId={story.id} key={i} />)}
              <button className="add-button" onClick={this.props.addStory}>Add story</button>
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
          let stories = TestUtils.scryRenderedDOMComponentsWithClass(container, 'story');
          stories.length.should.equal(2);
          done();
        });
        TestUtils.Simulate.click(button);
      });
    });

    it('can do $update actions', function (done) {
      nock('http://localhost')
        .put('/stories/2')
        .reply(201, {id: 2, title: 'My secondest post'});

      let StoryList = this.StoryListContainer;

      let container = TestHelpers.renderComponent(<StoryList />);

      this.StoryList.once('render', () => {
        let stories = TestUtils.scryRenderedDOMComponentsWithClass(container, 'story');
        let input = TestUtils.findRenderedDOMComponentWithTag(stories[1], 'input');
        this.Story.once('render', () => {
          input.getDOMNode().value.should.equal('My secondest post');
          done();
        });
        TestUtils.Simulate.change(input, {target: {value: 'My secondest post'}});
      });
    });

    it('can do $delete actions', function (done) {
      nock('http://localhost')
        .delete('/stories/2')
        .reply(204);

      let StoryList = this.StoryListContainer;

      let container = TestHelpers.renderComponent(<StoryList />);

      this.StoryList.once('render', () => {
        let stories = TestUtils.scryRenderedDOMComponentsWithClass(container, 'story');
        let button = TestUtils.findRenderedDOMComponentWithClass(stories[1], 'remove-button');
        this.StoryList.once('render', () => {
          stories = TestUtils.scryRenderedDOMComponentsWithClass(container, 'story');
          stories.length.should.equal(1);
          done();
        });
        TestUtils.Simulate.click(button);
      });
    });
  });
});

