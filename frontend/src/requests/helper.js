import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import qs from 'qs';

const fetchData = async (resource, params, setLoading, navigate) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/${resource}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            params: params,
            paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
        });

        const payload = response.data;
        // console.log(`Fetched data from ${resource}:`, payload);
        return payload;
    } catch (error) {
        console.error(`Error fetching ${resource}:`, error);
        if (error.response && error.response.status === 401) {
            navigate('/login');
        }
        return null;
    } finally {
        setLoading(false);
    }
};


const postData = async (resource, data, setLoading, navigate) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        console.log(`Posting data to ${resource}:`, data);
        setLoading(true);
        const response = await axios.post(`${API_BASE_URL}/api/${resource}`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const payload = response.data;
        // console.log(`Posted data to ${resource}:`, payload);
        return payload;
    } catch (error) {
        console.error(`Error posting to ${resource}:`, error);
        if (error.response && error.response.status === 401) {
            navigate('/login');
        }
        return null;
    }
}

const isValidPostalCode = (postalCode) => {
    // Canadian postal code regex
    const regex = /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/;
    return regex.test(postalCode);
};


export { fetchData, postData, isValidPostalCode };
export default {
    fetchData,
    postData
};