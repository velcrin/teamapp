import * as nconf from 'nconf';

nconf.argv()
  .env()
  .file(`${__dirname}/development.json`);

export default nconf;