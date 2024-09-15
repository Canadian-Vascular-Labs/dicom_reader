import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export const fetchData = async (resource, setData, setLoading, navigate) => {
   try {
      const token = localStorage.getItem('token');
      if (!token) {
         navigate('/login');
         return;
      }

      const response = await axios.get(`http://localhost:5000/api/${resource}`, {
         headers: {
            Authorization: `Bearer ${token}`,
         },
      });

      setData(response.data);
   } catch (error) {
      console.error(`Error fetching ${resource}:`, error);
      if (error.response && error.response.status === 401) {
         navigate('/login');
      }
   } finally {
      setLoading(false);
   }
};
