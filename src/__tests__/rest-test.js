/* eslint-env mocha */
/* eslint func-names:0 */
import * as utils from '../utils';
import * as rest from '../rest';

describe('rest', function () {
  describe('getHttpRequests', function () {
    describe('method', function () {
      it('is GET for type READ', function () {
        let requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {page: 1}}
        }));
        requests[0].method.should.equal('GET');
      });

      it('is POST for type CREATE', function () {
        let requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {$create: {}}}
        }));
        requests[0].method.should.equal('POST');
      });

      it('is PUT for type UPDATE', function () {
        let requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {$update: {}}}
        }));
        requests[0].method.should.equal('PUT');
      });

      it('is DELETE for type DELETE', function () {
        let requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {$delete: {}}}
        }));
        requests[0].method.should.equal('DELETE');
      });
    });

    describe('url', function () {
      it('is `/<collection>` by default', function () {
        let requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {}}
        }));
        requests[0].url.should.equal('/stories');
      });

      it('is `/<collection>/<$id>` if $id is set', function () {
        let requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {$id: '<storyId>'}}
        }));
        requests[0].url.should.equal('/stories/<$id>');
      });
    });

    describe('name', function () {
      it('is the query name', function () {
        let requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {}}
        }));
        requests[0].name.should.equal('story');
      });
    });

    describe('collection', function () {
      it('is the query collection', function () {
        let requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {}}
        }));
        requests[0].collection.should.equal('stories');
      });
    });

    describe('params', function () {
      it('is the query parameters', function () {
        let requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {$id: '<storyId>'}}
        }));
        requests[0].params.should.eql({$id: '<storyId>'});
      });
    });

    describe('paramDependencies', function () {
      it('is the list of used query parameter variables', function () {
        let requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {$id: '<storyId>'}}
        }));
        requests[0].paramDependencies.should.eql(['storyId']);
      });
    });
  });
});
