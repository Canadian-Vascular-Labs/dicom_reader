// src/components/FilterPanel.jsx
import React from 'react';
import { Divider, Space, Input, Select, Button } from 'antd';
import CPSOFilter from './CPSOFilter';
import NameFilter from './NameFilter';

const { Option } = Select;

export default function FilterPanel({ filters, onFilterChange, optionsMap, loadDoctors, setPage, exportToExcel, isExcelLoading }) {
    // console.log('filters:', filters);
    const cpso_filter = filters.find(filter => filter.id === "cpso");
    const name_filter = filters.find(filter => filter.id === "name");
    const other_filters = filters.filter(filter => filter.id !== "cpso" && filter.id !== "name");

    const resetFilters = () => {
        filters.forEach(filter => {
            onFilterChange(filter.id, filter.defaultValue || []);
        });
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <CPSOFilter filter={cpso_filter} onFilterChange={onFilterChange} />
                <NameFilter filter={name_filter} onFilterChange={onFilterChange} URL={"cpso/doctors/name"} />
                {other_filters.map(({ id, value, label }) => {
                    return (
                        <Select
                            // disabled={id === 'inMailingList'}
                            key={id}
                            // set mode to multiple if the id is not 'inMailingList'
                            // otherwise set it to 'default'
                            mode={id === 'inMailingList' ? 'default' : 'multiple'
                            }
                            allowClear
                            showSearch
                            placeholder={label}
                            // only show the first 2 selected options in the input box
                            maxTagCount={2}

                            style={{ minWidth: 200 }}
                            value={value}
                            options={optionsMap[id] || []}
                            onChange={vals => onFilterChange(id, vals)}
                            optionFilterProp='label'
                        />
                    );
                })}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                    type="primary"
                    onClick={() => {
                        loadDoctors();
                        setPage(1); // Reset to the first page when applying filters
                    }}
                    style={{ marginLeft: 8 }}
                >
                    Apply Filters
                </Button>
                <Button
                    type="primary"
                    onClick={resetFilters}
                    style={{ marginLeft: 8 }}
                >
                    Reset Filters
                </Button>
                <Button
                    type="primary"
                    onClick={exportToExcel}
                    loading={isExcelLoading}>
                    Download Excel
                </Button>
            </div>

        </div >
    );
}

