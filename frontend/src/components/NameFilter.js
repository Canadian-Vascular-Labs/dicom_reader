// src/components/CPSOFilter.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Select, Spin } from "antd";
import debounce from "lodash/debounce";
import { fetchData } from "../requests/helper";

const { Option } = Select;

const NameFilter = ({ filter, onFilterChange, onSelectChange }) => {
    // console.log("NameFilter:", filter);
    const [inputValue, setinputValue] = useState(""); // current text in the search box
    const [fetching, setFetching] = useState(false);
    const [names, setNames] = useState([]);

    /*
     *    Wrap in  debounce so it only fires after 300ms since the last keystroke
     *    if the user types again before 300ms, the old call is cancelled and a new 300ms timer starts.
     */
    const debouncedFetch = useCallback(
        debounce(async (query) => {

            setFetching(true);
            try {
                if (!query) {
                    // If the search box is empty, clear out options and stop loading:
                    setNames([]);
                    setFetching(false);
                    return;

                }
                const url = `cpso/doctors/name-${query}`;

                const data = await fetchData(url, {}, setFetching, () => { });
                if (Array.isArray(data)) {
                    const mapped = data.map((name) => ({
                        value: name,
                        label: name,
                    }));
                    setNames(mapped);
                } else {
                    setNames([]);
                }
            } catch (err) {
                console.error("Error fetching names from API:", err);
                setNames([]);
            } finally {
                setFetching(false);
            }
        }, 300),
        [] // empty dependency array → instantiate the debounced function once
    );

    /**
     * 5) Whenever inputValue changes, invoke the debounced fetch.
     *    The cleanup cancels any pending request if the component unmounts or
     *    if `inputValue` changes before the 300ms is up.
     */
    useEffect(() => {
        debouncedFetch(inputValue);

        return () => {
            debouncedFetch.cancel();
        };
    }, [inputValue, debouncedFetch]);

    /**
     * 6) This is called *when the user types* into the search box.
     *    AntD’s `onSearch` prop gives us the current text.
     */
    const handleSearch = (newSearch) => {
        setinputValue(newSearch);
    };

    /**
     * 7) This is called *when the user selects or clears* items from the dropdown.
     *    We forward the selected values to a parent (if provided).
     */

    return (
        <Select
            mode="multiple"
            allowClear
            showSearch
            maxTagCount={2}
            filterOption={false}               // turn off client‐side filtering
            placeholder="Search names..."
            notFoundContent={fetching ? <Spin size="small" /> : null}
            onSearch={handleSearch}           // called on typing, passes the search text
            onChange={vals => onFilterChange(filter.id, vals)}           // called on selection/clear, passes array of values
            style={{ minWidth: 200 }}
            options={names}             // the fetched [{ label, value }] array
        />
    );
};

export default NameFilter;
