const isDev = process.env.NODE_ENV === 'development';

export const API_BASE_URL = isDev
    ? 'http://localhost:8000'
    : process.env.REACT_APP_API_URL_PROD