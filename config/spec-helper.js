/**
 * Basic set up for spec files
 * Sinon and SinonChai is handled by `karma-chai-sinon`
 */
import 'sinon-as-promised';

/**
 * Sinon mocking sandbox
 */
const sandbox = sinon.sandbox.create();

const noop = () => {};

/**
 * Clean up sandbox
 */
afterEach(() => sandbox.restore());

global.noop = noop;