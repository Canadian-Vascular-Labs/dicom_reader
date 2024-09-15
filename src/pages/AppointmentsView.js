import React, { useState, useEffect } from 'react';
import { Table, Descriptions, AutoComplete, Input, Calendar } from 'antd';
import { useNavigate } from 'react-router-dom';
import { fetchData } from '../requests/helper';

const AppointmentsView = () => {
   const [appointments, setAppointments] = useState([]);
   const [doctors, setDoctors] = useState([]);
   const [loading, setLoading] = useState(true);

   const navigate = useNavigate();

   useEffect(() => {
      fetchData('doctors', setDoctors, setLoading, navigate);
      // fetchData('appointments', setAppointments, setLoading, navigate); // Fetch appointments from the backend for specific doctor
   }, [navigate]);

   // sider replace with Doctor's list
   console.log("DOCTORS: ", doctors);

   return (
      <div>

         <Descriptions title="Appointments View" />
         <Calendar />
      </div>
   )
};

export default AppointmentsView;