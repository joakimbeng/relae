/* eslint-env mocha */
/* eslint func-names:0 */
import * as utils from '../utils';

describe('utils', () => {
  describe('setParamValues', () => {
    it('replaces parameters in a nested object with their values', () => {
      const query = {storyId: '<storyId>', title: {$exists: '<titleExists>'}, parentId: 1};
      const params = {storyId: 1, titleExists: true};
      utils.setParamValues(query, params).should.eql({
        storyId: 1,
        title: {$exists: true},
        parentId: 1
      });
    });

    it('handles filter parameters containing arrays correctly (Issue #6)', () => {
      const query1 = {$or: [{prop1: true}, {prop2: false}]};
      utils.setParamValues(query1, {}).should.eql(query1);
      const query2 = {prop: {$in: ['alpha', 'beta']}};
      utils.setParamValues(query2, {}).should.eql(query2);
    });

    it('handles filter parameters containing arrays with parameters correctly', () => {
      const query1 = {$or: [{prop1: '<id>'}, {prop2: '<id>'}]};
      utils.setParamValues(query1, {id: 1}).should.eql({
        $or: [
          {prop1: 1},
          {prop2: 1}
        ]
      });
    });
  });

  describe('getRequestsFromQueries', () => {
    it('defaults to READ request', () => {
      const queries = {
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

    it('lists all used params in query', () => {
      const queries = {
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

    it('is a CREATE request if $create is set', () => {
      const queries = {
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

    it('is a DELETE request if $delete is set', () => {
      const queries = {
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

    it('is a UPDATE request if $update is set', () => {
      const queries = {
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
