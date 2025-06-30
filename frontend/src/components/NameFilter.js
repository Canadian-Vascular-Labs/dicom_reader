// src/components/CPSOFilter.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Select, Spin } from "antd";
import debounce from "lodash/debounce";
import { fetchData } from "../requests/helper";

const { Option } = Select;

const NameFilter = ({ name_filters, onFilterChange, URL, onSelectChange }) => {
    // console.log("NameFilter:", filter);
    const [fNameInputValue, setFNameInputValue] = useState(""); // current text in the search box
    const [lNameInputValue, setLNameInputValue] = useState(""); // current text in the search box
    const [fetching, setFetching] = useState(false);
    const [firstNameOptions, setFirstNameOptions] = useState([]);
    const [lastNameOptions, setLastNameOptions] = useState([]);

    const firstNameFilter = name_filters.find(filter => filter.id === "firstName");
    const lastNameFilter = name_filters.find(filter => filter.id === "lastName");

    useEffect(() => {
        if (firstNameFilter.value.length == 0) {
            setFNameInputValue("");
            setFirstNameOptions([]);
        }
        if (lastNameFilter.value.length == 0) {
            setLNameInputValue("");
            setLastNameOptions([]);
        }
    }, [firstNameFilter, lastNameFilter]);

    /*
     *    Wrap in  debounce so it only fires after 300ms since the last keystroke
     *    if the user types again before 300ms, the old call is cancelled and a new 300ms timer starts.
     */
    const debouncedFetch = useCallback(
        debounce(async (query, isFName) => {
            setFetching(true);
            try {
                if (!query) {
                    // If the search box is empty, clear out options and stop loading:
                    if (isFName) {
                        setFirstNameOptions([]);
                    } else {
                        setLastNameOptions([]);
                    }
                    setFetching(false);
                    return;

                }
                // const url = `${URL}-${query}`;
                const url = `${URL}?query=${encodeURIComponent(query)}&is_first_name=${isFName}`;

                // pass boolean paramater to API to indicate whether it's a first name or last name search
                // const params = { is_first_name: isFName };
                const params = {};

                const data = await fetchData(url, { params }, setFetching, () => { });
                if (Array.isArray(data)) {
                    const mapped = data.map((name) => ({
                        value: name,
                        label: name,
                    }));
                    if (isFName) {
                        setFirstNameOptions(mapped);
                    } else {
                        setLastNameOptions(mapped);
                    }
                } else {
                    if (isFName) {
                        setFirstNameOptions([]);
                    } else {
                        setLastNameOptions([]);
                    }
                }
            } catch (err) {
                console.error("Error fetching names from API:", err);
                if (isFName) {
                    setFirstNameOptions([]);
                } else {
                    setLastNameOptions([]);
                }
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
        if (fNameInputValue) {
            debouncedFetch(fNameInputValue, true);
        }

        return () => {
            debouncedFetch.cancel();
        };
    }, [fNameInputValue, debouncedFetch]);

    useEffect(() => {
        if (lNameInputValue) {
            debouncedFetch(lNameInputValue, false);
        }

        return () => {
            debouncedFetch.cancel();
        };
    }, [lNameInputValue, debouncedFetch]);

    /**
     * 6) This is called *when the user types* into the search box.
     *    AntD’s `onSearch` prop gives us the current text.
     */
    const handleSearch = (newSearch, isFName) => {
        if (isFName) {
            setFNameInputValue(newSearch);
        } else {
            setLNameInputValue(newSearch);
        }
    };

    /**
     * 7) This is called *when the user selects or clears* items from the dropdown.
     *    We forward the selected values to a parent (if provided).
     */

    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Select
                mode="multiple"
                allowClear
                showSearch
                maxTagCount={2}
                filterOption={false}               // turn off client‐side filtering
                placeholder="Search first names..."
                notFoundContent={fetching ? <Spin size="small" /> : null}
                onSearch={vals => handleSearch(vals, true)} // called on typing, passes the search text
                onChange={vals => onFilterChange(firstNameFilter.id, vals, firstNameOptions)}           // called on selection/clear, passes array of values
                style={{ minWidth: 200 }}
                options={firstNameOptions && firstNameOptions.length > 0 ?
                    [{ label: "Select All", value: "__all__" }, // add a "Select All" option
                    ...firstNameOptions] : []
                }
                value={
                    firstNameFilter.value.length > 0 ? firstNameFilter.value : []
                }
            />
            <Select
                mode="multiple"
                allowClear
                showSearch
                maxTagCount={2}
                filterOption={false}               // turn off client‐side filtering
                placeholder="Search last names..."
                notFoundContent={fetching ? <Spin size="small" /> : null}
                onSearch={vals => handleSearch(vals, false)} // called on typing, passes the search text
                onChange={vals => onFilterChange(lastNameFilter.id, vals, lastNameOptions)}           // called on selection/clear, passes array of values
                style={{ minWidth: 200 }}
                options={lastNameOptions && lastNameOptions.length > 0 ?
                    [{ label: "Select All", value: "__all__" }, // add a "Select All" option
                    ...lastNameOptions] : []
                }
                value={
                    lastNameFilter.value.length > 0 ? lastNameFilter.value : []
                }
            />
        </div>
    );
};

export default NameFilter;
