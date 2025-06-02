// src/components/FilterPanel.jsx
import React from 'react';
import { Divider, Space, Input, Select } from 'antd';
const { Option } = Select;



export default function FilterPanel({ filters, onFilterChange, optionsMap }) {
    // console.log('filters:', filters);
    return (
        <Space wrap size="middle" style={{ marginBottom: 16 }}>
            {filters.map(({ id, value, label }) => {
                return (
                    <Select
                        key={id}
                        // set mode to multiple if the id is not 'inMailingList'
                        // otherwise set it to 'default'
                        mode={id === 'inMailingList' ? 'default' : 'multiple'}
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
        </Space>
    );
}

