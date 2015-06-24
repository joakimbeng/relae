/* eslint-env mocha */
/* eslint func-names:0 */
import * as utils from '../utils';

describe('utils', function () {
  describe('setParamValues', function () {
    it('replaces parameters in a nested object with their values', function () {
      let query = {storyId: '<storyId>', title: {$exists: '<titleExists>'}, parentId: 1};
      let params = {storyId: 1, titleExists: true};
      utils.setParamValues(query, params).should.eql({
        storyId: 1,
        title: {$exists: true},
        parentId: 1
      });
    });

    it('handles filter parameters containing arrays correctly (Issue #6)', function () {
      let query1 = {$or: [{prop1: true}, {prop2: false}]};
      utils.setParamValues(query1, {}).should.eql(query1);
      let query2 = {prop: {$in: ['alpha', 'beta']}};
      utils.setParamValues(query2, {}).should.eql(query2);
    });
  });

  describe('getRequestsFromQueries', function () {
    it('defaults to READ request', function () {
      let queries = {
        stories: {story: {page: 1}}
      };
      utils.getRequestsFromQueries(queries).should.eql([{
        name: 'stories',
        collection: 'story',
        type: 'READ',
        paramDependencies: [],
        params: {
          page: 1
        }
      }]);
    });

    it('lists all used params in query', function () {
      let queries = {
        stories: {story: {page: '<pageId>'}}
      };
      utils.getRequestsFromQueries(queries).should.eql([{
        name: 'stories',
        collection: 'story',
        type: 'READ',
        paramDependencies: ['pageId'],
        params: {
          page: '<pageId>'
        }
      }]);
    });

    it('is a CREATE request if $create is set', function () {
      let queries = {
        addStory: {story: {$create: {}}}
      };
      utils.getRequestsFromQueries(queries).should.eql([{
        name: 'addStory',
        collection: 'story',
        type: 'CREATE',
        paramDependencies: [],
        params: {}
      }]);
    });

    it('is a DELETE request if $delete is set', function () {
      let queries = {
        removeStory: {story: {$delete: {}}}
      };
      utils.getRequestsFromQueries(queries).should.eql([{
        name: 'removeStory',
        collection: 'story',
        type: 'DELETE',
        paramDependencies: [],
        params: {}
      }]);
    });

    it('is a UPDATE request if $update is set', function () {
      let queries = {
        updateStory: {story: {$update: {}}}
      };
      utils.getRequestsFromQueries(queries).should.eql([{
        name: 'updateStory',
        collection: 'story',
        type: 'UPDATE',
        paramDependencies: [],
        params: {}
      }]);
    });
  });
});
