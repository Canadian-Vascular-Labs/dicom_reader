// src/components/DoctorsView.jsx

import React, { useState, useEffect } from 'react';
import {
    Descriptions,
    Button,
    Select,
    Space,
    Table,
} from 'antd';
import { fetchData } from '../requests/helper';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

// 1) filterable fields
const filterOptions = [
    { value: 'postalcode', label: 'Filter by Postal Code' },
    { value: 'specialties', label: 'Filter by Specialties' },
    { value: 'name', label: 'Filter by Name' },
];

// 2) load list of all specialties and FSAs
const { specialties: allSpecs } = require('../data/specialties.json');
const specialtyOptions = allSpecs.map(s => ({ value: s, label: s }));

const { FSAs: allFSA } = require('../data/fsa.json');
const fsaOptions = allFSA.map(f => ({ value: f, label: f }));

// 3) columns to be displayed in the table
const columns = [
    { title: 'CPSO Number', dataIndex: 'cpsonumber', key: 'cpsonumber', width: 150, ellipsis: true },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 200, ellipsis: true },
    { title: 'Specialties', dataIndex: 'specialties', key: 'specialties', width: 150, ellipsis: true },
    { title: 'Street1', dataIndex: 'street1', key: 'street1', width: 200, ellipsis: true },
    { title: 'Street2', dataIndex: 'street2', key: 'street2', width: 150, ellipsis: true },
    { title: 'Street3', dataIndex: 'street3', key: 'street3', width: 150, ellipsis: true },
    { title: 'Street4', dataIndex: 'street4', key: 'street4', width: 150, ellipsis: true },
    { title: 'City', dataIndex: 'city', key: 'city', width: 120, ellipsis: true },
    { title: 'Province', dataIndex: 'province', key: 'province', width: 100, ellipsis: true },
    { title: 'Postal Code', dataIndex: 'postalcode', key: 'postalcode', width: 100, ellipsis: true },
    { title: 'Phone Number', dataIndex: 'phonenumber', key: 'phonenumber', width: 130, ellipsis: true },
    { title: 'Fax', dataIndex: 'fax', key: 'fax', width: 130, ellipsis: true },
    {
        title: 'Registration Status',
        dataIndex: 'registrationstatuslabel',
        key: 'registrationstatuslabel',
        width: 120,
        ellipsis: true
    },
];

export default function DoctorsView() {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterValues, setFilterValues] = useState({
        postalcode: [],
        specialties: [],
        name: []
    });
    const navigate = useNavigate();

    // fetch once
    useEffect(() => {
        fetchData('doctors', setDoctors, setLoading, navigate);
    }, [navigate]);

    // helper: returns the doctors array filtered _only_ by all fields except `skipField`
    const doctorsMatchingOtherFilters = (skipField) => {
        // console.log('doctorsMatchingOtherFilters', skipField); // should be 'name'
        return doctors.filter(doc =>
            filterOptions
                .map(o => o.value)
                .filter(f => f !== skipField)
                .every(field => {
                    const selected = filterValues[field] || [];
                    if (!selected.length) return true;
                    const cell = (doc[field] || '').toString().toLowerCase();
                    return selected.some(val =>
                        cell.includes(val.toLowerCase())
                    );
                })
        );
    };

    // build the options for a given field by looking only at doctorsMatchingOtherFilters(field)
    const getOptionsFor = (field) => {
        if (field === 'specialties') return specialtyOptions;
        if (field === 'postalcode') return fsaOptions;
        // for name, or any other dynamic field:
        const subset = doctorsMatchingOtherFilters(field);
        const allVals = Array.from(
            new Set(subset.map(d => (d[field] || '').trim()).filter(v => v))
        );
        return allVals.map(v => ({ value: v, label: v }));
    };

    // finally, apply _all_ filters to produce the table rows
    const filteredDoctors = doctors.filter(doc =>
        filterOptions.every(({ value: field }) => {
            const selected = filterValues[field] || [];
            if (!selected.length) return true;
            const cell = (doc[field] || '').toString().toLowerCase();
            return selected.some(val =>
                cell.includes(val.toLowerCase())
            );
        })
    );

    // CSV‐download

    // define exportToExcel function
    const exportToExcel = () => {
        if (!filteredDoctors.length) return;

        // 1) gather all the keys
        const tableFields = columns.map(c => c.dataIndex);
        const extraFields = Array.from(
            new Set(
                filteredDoctors.flatMap(doc =>
                    Object.keys(doc).filter(k => !tableFields.includes(k))
                )
            )
        );

        // 2) final ordered list of all fields
        const allFields = [...tableFields, ...extraFields];

        // 3) header row: column titles (for the table fields) + raw key names (for extras)
        const header = [
            ...columns.map(c => `"${c.title.replace(/"/g, '""')}"`),
            ...extraFields.map(f => `"${f.replace(/"/g, '""')}"`)
        ].join(',');

        // 4) build each data row
        const rows = filteredDoctors.map(doc =>
            allFields.map(field => {
                let val = doc[field];

                // if it's an object/array, stringify it
                if (typeof val === 'object') {
                    val = JSON.stringify(val);
                }

                // normalize undefined/null → empty string
                val = val == null ? '' : val;

                // escape any quotes/newlines
                const escaped = String(val).replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(',')
        );

        // 5) assemble CSV and trigger download
        const csvContent = [header, ...rows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'doctors_data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            <Descriptions title="Doctors View" />

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                width: '100%',
            }}>
                <Space wrap size="middle">
                    {filterOptions.map(({ value: field, label }) => (
                        <Select
                            key={field}
                            mode="multiple"
                            allowClear
                            showSearch
                            placeholder={label}
                            style={{ minWidth: 200 }}
                            options={getOptionsFor(field)}
                            value={filterValues[field]}
                            onChange={vals =>
                                setFilterValues(fv => ({ ...fv, [field]: vals }))
                            }
                            filterOption={(input, opt) =>
                                opt.label.toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    ))}
                </Space>

                <Button
                    type="primary"
                    onClick={exportToExcel}  // whatever your CSV/Excel helper is
                    style={{ marginLeft: 16 }}
                >
                    Export to Excel
                </Button>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <Table
                    dataSource={filteredDoctors}
                    columns={columns}
                    loading={loading}
                    rowKey="cpsonumber"
                    pagination={{ pageSize: 100 }}
                    scroll={{ x: columns.reduce((sum, c) => sum + (c.width || 100), 0) }}
                />
            </div>
        </div>
    );
}
