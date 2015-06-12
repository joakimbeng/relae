import rest from 'rest';
import mime from 'rest/interceptor/mime';

const client = rest.wrap(mime);

export default (options) => client(options);
