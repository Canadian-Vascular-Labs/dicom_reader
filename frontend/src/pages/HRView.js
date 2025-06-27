import React from 'react'
import { useState, useEffect } from 'react';
import { fetchData } from '../requests/helper';
import { Button, Table } from 'antd';
import NameFilter from '../components/NameFilter';


const certification_columns = [
    {
        title: 'Certification Name',
        key: 'name',
        dataIndex: 'name',
    },
    {
        title: 'Default Validity Days',
        key: 'default_validity_days',
        dataIndex: 'default_validity_days',
    },
    {
        title: 'Description',
        key: 'description',
        dataIndex: 'description',
    },
]

const employee_columns = [
    {
        title: 'Employee Name',
        key: 'name',
        dataIndex: 'first_name',
        render: (text, record) => `${record.first_name} ${record.last_name}`,
    },
    {
        title: 'Role',
        key: 'role',
        dataIndex: 'role',
    }

]


const HRView = () => {
    const [certifications, setCertifications] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);

    const savedPage = localStorage.getItem('hrViewPage');
    const savedPageSize = localStorage.getItem('hrViewPageSize');

    const [page, setPage] = useState(savedPage ? parseInt(savedPage, 10) : 1);
    const [pageSize, setPageSize] = useState(savedPageSize ? parseInt(savedPageSize, 10) : 30);
    const [totalEmployees, setTotalEmployees] = useState(0);

    const [filters, setFilters] = useState([
        { id: "name", value: [], label: "Name" },
        // role
    ]);

    useEffect(() => {
        const fetchCertifications = async () => {
            try {
                // const data = await fetchData("cpso/specialties", {}, setLoading, () => { });
                const data = await fetchData('certification_tracking/certifications', {}, setLoading); // Adjust the endpoint as needed
                setCertifications(data);
            } catch (error) {
                console.error('Error fetching certifications:', error);
            }
        };
        const fetchEmployees = async () => {
            try {
                const data = await fetchData('certification_tracking/employees', {}, setLoading); // Adjust the endpoint as needed
                setEmployees(data);
                setTotalEmployees(data.length); // Assuming the API returns the total count of employees
            } catch (error) {
                console.error('Error fetching employees:', error);
            }
        };

        fetchCertifications();
        fetchEmployees();
    }, []);

    // console.log('Certifications:', certifications);
    // console.log('Employees:', employees);

    const handleFilterChange = (id, newValue) => {
        console.log(`Filter change for ${id}:`, newValue);
        setFilters((f) =>
            f.map((x) => (x.id === id ? { ...x, value: newValue } : x))
        );
        // setPage(1); // reset to first page on filter change
    };

    return (
        <div>
            {/* create a table for the certifications */}
            {/*
            {certifications.length > 0 ? (
                <div>
                    <h2>Certifications</h2>
                    {loading && <p>Loading...</p>}
                    <Table
                        loading={loading}
                        columns={certification_columns}
                        dataSource={certifications || []} // Ensure dataSource is an array
                        rowKey="id"
                        pagination={{ pageSize: 30 }} // Adjust pagination as needed
                    />
                </div>
            ) : (
                <p>No certifications found.</p>
            )}
            */}
            <NameFilter
                filter={filters.find(filter => filter.id === "name")}
                onFilterChange={handleFilterChange}
                // URL="certification_tracking/employees/name"
                data_arr={employees}
            />
            {employees && employees.length > 0 ? (
                <div>
                    {loading && <p>Loading...</p>}
                    <Table
                        loading={loading}
                        columns={employee_columns}
                        dataSource={employees || []} // Ensure dataSource is an array
                        rowKey="id"
                        pagination={{
                            current: page,
                            pageSize: pageSize,
                            total: totalEmployees, // Ensure totalEmployees is defined
                            onChange: (newPage, pageSize) => {
                                setPage(newPage);
                                setPageSize(pageSize);

                                localStorage.setItem('hrViewPage', newPage);
                                localStorage.setItem('hrViewPageSize', pageSize);
                            },
                        }}
                    />
                </div>
            ) : (
                <p>No employees found.</p>
            )}
        </div>
    )
}

export default HRView
