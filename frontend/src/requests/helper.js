import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export const fetchData = async (resource, setLoading, navigate) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const response = await axios.get(`${API_BASE_URL}/api/${resource}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const payload = response.data;
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
