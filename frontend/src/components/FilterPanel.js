// src/components/FilterPanel.jsx

import React, { useState } from "react";
import { Select, Button } from "antd";
import CPSOFilter from "./CPSOFilter";
import NameFilter from "./NameFilter";

export default function FilterPanel({
    filters,
    onFilterChange,
    optionsMap,
    loadDoctors,
    setPage,
    exportToExcel,
    isExcelLoading
}) {
    // split out filters
    const cpsoFilter = filters.find(f => f.id === "cpso");
    const nameFilters = filters.filter(f => ["firstName", "lastName"].includes(f.id));
    const otherFilters = filters.filter(
        f => !["cpso", "firstName", "lastName"].includes(f.id)
    );

    // track filtered options for each filter dynamically
    const [filteredOptionsMap, setFilteredOptionsMap] = useState({});

    console.log("FilterPanel: optionsMap:", optionsMap);

    const handleSearch = (input, id) => {
        const baseOptions = optionsMap[id] || [];
        console.log("Base options for", id, ":", baseOptions);
        const filtered = baseOptions.filter(opt =>
            opt.label.toLowerCase().includes(input.toLowerCase())
        );
        console.log("Filtered options for", id, ":", filtered);
        setFilteredOptionsMap(prev => ({
            ...prev,
            [id]: filtered
        }));
    };

    const resetFilters = () => {
        filters.forEach(filter => {
            onFilterChange(filter.id, filter.defaultValue || []);
        });
    };

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16
            }}
        >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {/* CPSO search */}
                <CPSOFilter filter={cpsoFilter} onFilterChange={onFilterChange} />

                {/* First & Last name filters */}
                <NameFilter
                    name_filters={nameFilters}
                    onFilterChange={onFilterChange}
                    URL="cpso/doctors/names"
                />

                {/* Other filters */}
                {otherFilters.map(({ id, value, label }) => (
                    <Select
                        disabled={id === "inMailingList"} // disable inMailingList filter
                        key={id}
                        mode={id === "inMailingList" ? "default" : "multiple"}
                        allowClear
                        showSearch
                        placeholder={label}
                        maxTagCount={2}
                        style={{ minWidth: 200 }}
                        value={value}
                        // dynamically override filtering
                        filterOption={(input, option) => {
                            if (option.value === "__all__") return true;
                            return option.label.toLowerCase().includes(input.toLowerCase());
                        }}
                        onSearch={input => handleSearch(input, id)}
                        options={
                            (id === "specialty" ? optionsMap[id] :
                                (filteredOptionsMap[id] && filteredOptionsMap[id].length > 0
                                    ? [
                                        { label: "Select All", value: "__all__" },
                                        ...(Array.isArray(filteredOptionsMap[id]) ? filteredOptionsMap[id] : [])
                                    ]
                                    : [
                                        { label: "Select All", value: "__all__" },
                                        ...(Array.isArray(optionsMap[id]) ? optionsMap[id] : [])
                                    ]
                                ))
                        }

                        onChange={vals => {
                            // if Select All was chosen, apply only *currently visible* filtered options
                            if (vals.includes("__all__")) {
                                const current = filteredOptionsMap[id] || optionsMap[id] || [];
                                vals = current.map(opt => opt.value);
                            }
                            onFilterChange(id, vals);
                        }}
                        optionFilterProp="label"
                    />
                ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
                <Button
                    type="primary"
                    onClick={() => {
                        loadDoctors();
                        setPage(1);
                    }}
                >
                    Apply Filters
                </Button>
                <Button type="primary" onClick={resetFilters}>
                    Reset Filters
                </Button>
                <Button type="primary" onClick={exportToExcel} loading={isExcelLoading}>
                    Download Excel
                </Button>
            </div>
        </div>
    );
}
