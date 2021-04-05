const dotenv = require('dotenv');
const paths = require('./paths');

const NODE_ENV = process.env.NODE_ENV || 'development';

const envFile = `${paths.config}/env/${NODE_ENV}.env`;
dotenv.config({ path: envFile });