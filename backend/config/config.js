// load environment variables from .env file
require('dotenv').config();


console.log('Loading environment variables from .env file: server: ', process.env.NODE_ENV);
console.log('MONGO_URI_DEV: ', process.env.MONGO_URI_DEV);
console.log('MONGO_URI_PROD: ', process.env.MONGO_URI_PROD);
const MONGO_URI = (process.env.NODE_ENV === 'development')
    ? process.env.MONGO_URI_DEV
    : process.env.MONGO_URI_PROD;
console.log('MONGO_URI: ', MONGO_URI);


module.exports = {
    MONGO_URI,
}