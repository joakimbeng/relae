/* eslint-env mocha */
/* eslint func-names:0 */
import * as utils from '../utils';
import rest from '../rest';

describe('rest', () => {
  describe('getHttpRequests', () => {
    describe('method', () => {
      it('is GET for type READ', () => {
        const requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {page: 1}}
        }));
        requests[0].method.should.equal('GET');
      });

      it('is POST for type CREATE', () => {
        const requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {$create: {}}}
        }));
        requests[0].method.should.equal('POST');
      });

      it('is PUT for type UPDATE', () => {
        const requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {$update: {}}}
        }));
        requests[0].method.should.equal('PUT');
      });

      it('is DELETE for type DELETE', () => {
        const requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {$delete: {}}}
        }));
        requests[0].method.should.equal('DELETE');
      });
    });

    describe('url', () => {
      it('is `/<collection>` by default', () => {
        const requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {}}
        }));
        requests[0].url.should.equal('/stories');
      });

      it('is `/<collection>/<$id>` if $id is set', () => {
        const requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {$id: '<storyId>'}}
        }));
        requests[0].url.should.equal('/stories/<$id>');
      });
    });

    describe('getFullUrl', () => {
      it('replaces <$id> in url with $id param and prefixes with `baseUrl`', () => {
        const requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {$id: '<storyId>'}}
        }));
        requests[0].getFullUrl({$id: '#1'}, {baseUrl: 'http://example.com'}).should.equal('http://example.com/stories/%231');
      });
    });

    describe('name', () => {
      it('is the query name', () => {
        const requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {}}
        }));
        requests[0].name.should.equal('story');
      });
    });

    describe('collection', () => {
      it('is the query collection', () => {
        const requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {}}
        }));
        requests[0].collection.should.equal('stories');
      });
    });

    describe('params', () => {
      it('is the query parameters', () => {
        const requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {$id: '<storyId>'}}
        }));
        requests[0].params.should.eql({$id: '<storyId>'});
      });
    });

    describe('paramDependencies', () => {
      it('is the list of used query parameter variables', () => {
        const requests = rest.getHttpRequests(utils.getRequestsFromQueries({
          story: {stories: {$id: '<storyId>'}}
        }));
        requests[0].paramDependencies.should.eql(['storyId']);
      });
    });
  });
});
