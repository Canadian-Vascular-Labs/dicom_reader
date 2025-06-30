// src/components/CPSOFilter.jsx
import React, { useState, useEffect, useCallback, use } from "react";
import { Select, Spin } from "antd";
import debounce from "lodash/debounce";
import { fetchData } from "../requests/helper";

const { Option } = Select;

const CPSOFilter = ({ filter, onFilterChange, onSelectChange }) => {
    // console.log("CPSOFilter: filter:", filter);
    const [inputValue, setinputValue] = useState(""); // current text in the search box
    const [fetching, setFetching] = useState(false);
    const [cpsoNumbers, setCpsoNumbers] = useState([]);
    // console.log("CPSOFilter: cpsoNumbers:", cpsoNumbers);

    useEffect(() => {
        if (filter.value.length == 0) {
            setinputValue("");
            setCpsoNumbers([]);
        }
    }, [filter]);
    /*
     *    Wrap in  debounce so it only fires after 300ms since the last keystroke
     *    if the user types again before 300ms, the old call is cancelled and a new 300ms timer starts.
     */
    const debouncedFetch = useCallback(
        debounce(async (query) => {
            // if (!query) {
            //     // If the search box is empty, clear out options and stop loading:
            //     setCpsoNumbers([]);
            //     setFetching(false);
            //     return;
            // }

            setFetching(true);
            try {
                if (!query) {
                    // If the search box is empty, clear out options and stop loading:
                    setCpsoNumbers([]);
                    setFetching(false);
                    return;
                }
                const url = `cpso/doctors/fetch-${query}`;

                const data = await fetchData(url, {}, setFetching, () => { });
                if (Array.isArray(data)) {
                    const mapped = data.map((cpsoNumber) => ({
                        value: cpsoNumber,
                        label: cpsoNumber,
                    }));
                    setCpsoNumbers(mapped);
                } else {
                    setCpsoNumbers([]);
                }
            } catch (err) {
                console.error("Error fetching CPSO numbers:", err);
                setCpsoNumbers([]);
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

    return (
        <Select
            mode="multiple"
            allowClear
            showSearch
            maxTagCount={2}
            filterOption={false}               // turn off client‐side filtering
            placeholder="Search CPSO numbers..."
            notFoundContent={fetching ? <Spin size="small" /> : null}
            onSearch={handleSearch}           // called on typing, passes the search text
            onChange={vals => onFilterChange(filter.id, vals, cpsoNumbers)}           // called on selection/clear, passes array of values
            style={{ minWidth: 200 }}
            options={cpsoNumbers && cpsoNumbers.length > 0 ?
                [{ label: "Select All", value: "__all__" }, // add a "Select All" option
                ...cpsoNumbers] : []
            }
            value={filter.value} // controlled value from the parent
        />
    );
};

export default CPSOFilter;
