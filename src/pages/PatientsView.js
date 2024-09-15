import React, { useState, useEffect } from 'react';
import { Table, Descriptions, AutoComplete, Input } from 'antd';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { fetchData } from '../requests/helper';

const columns = [
   {
      title: 'Patient ID',
      dataIndex: '_id',
      key: 'id',
   },
   {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
   },
   {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
   },
   {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
   },
   {
      title: 'Clinic',
      dataIndex: 'clinics',
      key: 'clinic',
   }
];

const PatientsView = () => {
   const [patients, setPatients] = useState([]);
   const [loading, setLoading] = useState(true);
   const [searchText, setSearchText] = useState('');
   const [options, setOptions] = useState([]);

   const navigate = useNavigate();

   // Fetch patients from the backend
   useEffect(() => {
      fetchData('patients', setPatients, setLoading, navigate);
   }, [navigate]);

   const onSearch = (value) => {
      setSearchText(value.toLowerCase());
      const filteredOptions = patients
         .filter((patient) =>
            patient.name.toLowerCase().includes(value.toLowerCase())
            // or HCN
         )
         .map((patient) => ({
            value: patient.name,
            label: `${patient.name} (HCN: ${patient._id})`,
         }));

      setOptions(filteredOptions);
   };

   const filteredPatients = patients.filter((patient) => {
      return patient.name.toLowerCase().includes(searchText);
   });

   return (
      <div>
         <Descriptions title="Patients View" />
         <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <AutoComplete
               options={options}
               onSearch={onSearch}
               style={{ flexGrow: 1, maxWidth: '100%' }} // Stretch search bar with flex-grow
            >
               <Input.Search placeholder="Search patients" size="large" />
            </AutoComplete>
         </div>
         <Table
            dataSource={filteredPatients}
            columns={columns}
            loading={loading}
            rowKey="id"
         />
      </div>
   );
};

export default PatientsView;
