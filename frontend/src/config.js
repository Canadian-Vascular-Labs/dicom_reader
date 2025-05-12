const isDev = process.env.NODE_ENV === 'development';

export const API_BASE_URL = isDev
    ? process.env.REACT_APP_API_URL_DEV
    : process.env.REACT_APP_API_URL_PROD;
