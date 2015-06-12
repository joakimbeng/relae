import jsdom from 'jsdom';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

global.sinon = sinon;
global.should = chai.should();
chai.use(sinonChai);

// A super simple DOM ready for React to render into
// Store this DOM and the window in global scope ready for React to access
global.document = jsdom.jsdom('<!doctype html><html><body></body></html>');
global.window = document.defaultView;
global.navigator = global.window.navigator;
global.window.location.href = 'http://localhost';
global.location = window.location;
