import rest from 'rest';
import mime from 'rest/interceptor/mime';
import errorCode from 'rest/interceptor/errorCode';

const client = rest.wrap(mime).wrap(errorCode, {code: 400});

export default (options) => client(options);
