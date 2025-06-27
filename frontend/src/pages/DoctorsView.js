import React, { useState, useEffect, use, useCallback, useMemo } from "react";
import { fetchData, isValidPostalCode } from "../requests/helper";
import { Table, Descriptions, Row, Col } from "antd";
import FilterPanel from "../components/FilterPanel";
import FilterSideBar from "../components/FilterSideBar";
import { set } from "mongoose";
import ImportCPSOView from "./ImportCPSOView";
import { API_BASE_URL } from "../config";
import axios from "axios";

const columns = [
    {
        title: "CPSO Number",
        dataIndex: "cpso_number", // key from the API
        key: "cpsonumber",
        width: 150,
        ellipsis: true,
    },
    {
        title: "Name", dataIndex: "name", key: "name", width: 200, ellipsis: true,
        render: (text, doctor) => (
            <span>
                {doctor.first_name} {doctor.last_name}
            </span>
        )
    },
    {
        title: "Specialties",
        dataIndex: "specialties",
        key: "specialties",
        width: 200,
        ellipsis: true,
        render: (specialties) => (
            <span>
                {specialties.length > 0 ?
                    specialties.map((spec, index) => (
                        <span key={index}>
                            {spec.name}
                            {index < specialties.length - 1 ? ", " : ""}
                        </span>
                    )) :
                    <span style={{ color: "red" }}>No specialties listed</span>
                }
            </span>
        ),
    },
    {
        title: "Addresses",
        dataIndex: "addresses",
        key: "addresses",
        width: 200,
        ellipsis: true,
        render: (addresses) => (
            <span>
                {addresses.filter(addr => isValidPostalCode(addr.postal_code)).map((addr, index) => (
                    <span key={index}>
                        {/* skip if not valid postal code */}
                        <span style={{}}>
                            {addr.postal_code}
                            {index < addresses.length - 1 ? ", " : ""}
                        </span>
                    </span>
                ))}
            </span>
        ),
    },
    // {
    //     title: "In Mailing List",
    //     dataIndex: "in_mailing_list",
    //     key: "is_on_mailing_list",
    //     width: 100,
    //     ellipsis: true,
    //     render: (inMailingList) => (
    //         <span>{inMailingList ? "Yes" : "No"}</span>
    //     ),
    // },
];

export default function DoctorsView() {
    const savedPage = Number(localStorage.getItem("doctorsPage")) || 1;
    const savedPageSize = Number(localStorage.getItem("doctorsPageSize")) || 50;
    const [cpsoNumbers, setCpsoNumbers] = useState([]);

    const [page, setPage] = useState(savedPage);
    const [pageSize, setPageSize] = useState(savedPageSize);


    const [loading, setLoading] = useState(true);
    const [isExcelLoading, setIsExcelLoading] = useState(false);
    const [doctors, setDoctors] = React.useState([]);
    const [filters, setFilters] = useState([
        { id: "name", value: [], label: "Name" },
        { id: "cpso", value: [], label: "CPSO Number" },
        { id: "labs", value: [], label: "Labs" },
        { id: "fsa", value: [], label: "FSA" },
        { id: "specialty", value: [], label: "Specialty" },
        { id: "inMailingList", value: [], label: "In Mailing List" },
    ]);
    const [columnSize, setColumnSize] = useState(200);
    const [isSideBarVisible, setIsSideBarVisible] = useState(true);
    const [specialties, setSpecialties] = useState([]);
    const [FSAs, setFSAs] = useState({});
    const [labs, setLabs] = useState([]);
    const [optionsMap, setOptionsMap] = useState({
        specialty: [],
        fsa: [],
    });
    const [totalDoctors, setTotalDoctors] = useState(0);



    const fetchSpecialties = useCallback(async () => {
        try {
            const data = await fetchData("cpso/specialties", {}, setLoading, () => { });
            if (!data) {
                console.error("Failed to fetch specialties data");
                return null;
            }
            return data;
        } catch (error) {
            console.error("Error fetching specialties:", error);
            return null;
        }
    }, []);

    const fetchLocations = useCallback(async () => {
        try {
            const data = await fetchData("cpso/locations", {}, setLoading, () => { });
            if (!data) {
                console.error("Failed to fetch locations data");
                return null;
            }
            return data;
        } catch (error) {
            console.error("Error fetching locations:", error);
            return null;
        }
    }, []);


    const loadSpecialties = useCallback(async () => {
        console.log("Loading specialties from API + JSON...");
        const data = await fetchSpecialties();
        // console.log("Specialties data loaded:", data);
        const jsonData = require("../data/specialties.json");

        const otherSpecs = data
            .map((spec) => spec.name)
            .filter((spec) => !jsonData.specialties.some((s) => s === spec))

        const specialty_array = [
            {
                label: <span>Mass Selection Options</span>,
                title: "Mass Selection Options",
                options: [
                    { value: "defaults", label: "Select All (Defaults)" },
                    { value: "all", label: "Select All (+ Other)" },
                ],
            },
            {
                label: <span>Main Specialties</span>,
                title: "Main Specialties",
                options: jsonData.specialties.map((spec) => ({
                    value: spec,
                    label: spec,
                })).sort((a, b) => a.label.localeCompare(b.label)),
            },
            {
                label: <span>Other Specialties</span>,
                title: "Other Specialties",
                // filter out the main specialties from the options
                options: otherSpecs.map((spec) => ({
                    value: spec,
                    label: spec,
                })).sort((a, b) => a.label.localeCompare(b.label)),
            },
        ];
        setSpecialties(specialty_array);

    }, [fetchSpecialties]);


    const buildParams = (filters, limit = true) => {
        const fsaFilter = filters.find((f) => f.id === "fsa");
        const fsaValues = fsaFilter?.value ?? [];

        const labFsaValues = filters
            .find((f) => f.id === "labs")
            ?.value             // e.g. ["Markham", "Thornhill"]
            .flatMap((labKey) => labs[labKey] ?? []) ?? [];

        const allFSAs_unique = Array.from(new Set([...fsaValues, ...labFsaValues]));
        const specialtyFilter = filters.find((f) => f.id === "specialty");

        if (specialtyFilter.value.includes("defaults")) {
            specialtyFilter.value = specialties
                .find((s) => s.title === "Main Specialties")
                .options.map((o) => o.value);
        }
        else if (specialtyFilter.value.includes("all")) {
            specialtyFilter.value = specialties
                .filter((s) => s.title !== "Mass Selection Options")
                .flatMap((s) => s.options.map((o) => o.value));
        }




        const cpsoFilter = filters.find((f) => f.id === "cpso");
        const NameFilter = filters.find((f) => f.id === "name");
        const MailingListFilter = filters.find((f) => f.id === "inMailingList");
        console.log("MailingListFilter:", MailingListFilter);
        console.log("MailingListFilter val:", MailingListFilter.value);
        const params = {
            ...(allFSAs_unique?.length && { include_FSAs: allFSAs_unique }),
            ...(specialtyFilter?.value?.length && {
                include_specialties: specialtyFilter.value,
            }),
            ...(cpsoFilter?.value?.length && {
                include_CPSOs: cpsoFilter.value,
            }),
            ...(NameFilter?.value?.length && {
                include_names: NameFilter.value,
            }),

            // only include mailing list param if the filter is set to Yes or No
            ...(MailingListFilter && MailingListFilter.value && {
                include_mailing_list: MailingListFilter.value === "Yes" ? true : false,
            }),

            offset: (page - 1) * pageSize,
            limit: limit ? pageSize : undefined,
        };

        console.log("Params built for API request:", params);

        return params;
    };

    // load labs from JSON file
    const loadLocations = useCallback(async () => {
        const jsonData = require("../data/fsa.json");
        setLabs(jsonData.LabFSAs || {});

        console.log("Loading JSON data for lab FSAs...");
        const data = await fetchLocations();
        // console.log("Locations data loaded:", data);

        // data: [{id: 1, FSA: "A1A"}, {id: 2, FSA: "B2B"}, ...]
        // setFSAs to an array of objects with value and label properties
        // e.g. [{value: "A1A", label: "A1A" }, {value: "B2B", label: "B2B" }, ...]
        const new_data = data.map((location) => ({
            value: location.FSA,
            label: location.FSA,
        })).sort((a, b) => a.label.localeCompare(b.label));
        // console.log("FSAs loaded:", new_data);
        setFSAs(new_data);



        // setFSAs((data).map((location) => ({
        //     value: location.FSA,
        //     label: location.FSA,
        // })) // .sort((a, b) => a.FSA.localeCompare(b.FSA))
        //     || []);
        // // .sort((a, b) => a.FSA.localeCompare(b.FSA)) || []);

    }, [fetchLocations]);

    const fetchDoctors = useCallback(async (params) => {
        try {
            const data = await fetchData("cpso/doctors", params, setLoading, () => { });
            if (!data) {
                console.error("Failed to fetch doctors data");
                return null;
            }
            return data;
        } catch (error) {
            console.error("Error fetching doctors:", error);
            return null;
        }
    }, []);

    const loadDoctors = useCallback(async () => {
        console.log("param::Loading doctors from API...");
        const params = buildParams(filters);
        const data = await fetchDoctors(params);
        if (data) {
            // console.log("Total doctors fetched:", data.count);
            setDoctors(data);
            setTotalDoctors(data.count || 0);
            console.log("Doctors data loaded:", data);
        } else {
            console.error("Failed to fetch doctors data");
        }
    }, [filters, fetchDoctors, page, pageSize]);

    // general useEffect to load initial data on component mount
    useEffect(() => {
        loadLocations();
        loadSpecialties(); // calls setSpecialties to contain the array of main/other specialties
        loadDoctors(); // fetch doctors data based on current filters
    }, []);

    // create optionsMap for the filters (happens after specialties are loaded from initial load)
    useMemo(() => {
        // build options map for the filters
        // labs is a dictionary, print the keys:
        const labKeys = Object.keys(labs).sort((a, b) => a.localeCompare(b)).map
            ((lab) => ({
                value: lab,
                label: lab,
            }));
        setOptionsMap({
            specialty: specialties,
            fsa: FSAs,
            labs: labKeys,
            inMailingList: [
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
            ],
            cpso: [],
        });

    }, [specialties]);

    // useEffect to load doctors data when filters or page changes
    useEffect(() => {
        // update column size based on string length of the longest filter value
        // const maxWidth = filters
        //     .filter((f) => f.id === "specialty") // filter out "FSA" since they're always length 3
        //     .reduce((max, filterGroup) => {
        //         const groupMax = filterGroup.value.reduce((groupMax, option) => {
        //             return Math.max(groupMax, option.length * 8); // Assuming each character is roughly 8px wide
        //         }, 0);
        //         return Math.max(max, groupMax);
        //     }, 200);
        // setColumnSize(maxWidth); // add some padding
        // set isSideBarVisible to true if there are filters applied

        // make sure this fetches the lab FSAs as well!!
        console.log("PAGE CHANGE: Loading doctors!");
        loadDoctors(); // fetch doctors data based on current filters

    }, [pageSize, page])


    const exportToExcel = useCallback(async () => {
        console.log("Exporting to Excel...");
        try {
            const token = localStorage.getItem("token");
            const params = buildParams(filters, false);
            // console.log("Export params:", params);
            // return;

            setIsExcelLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/cpso/doctors/export`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: params,
                responseType: "blob",  // 👈 tell axios to expect binary data
            });


            const blob = new Blob([response.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = "doctors_export.xlsx";
            link.click();
            link.remove();

        } catch (error) {
            console.error("Excel export failed:", error);
        } finally {
            setIsExcelLoading(false);
        }
    }, [filters]);



    const handleFilterChange = (id, newValue) => {
        console.log(`Filter change for ${id}:`, newValue);
        setFilters((f) =>
            f.map((x) => (x.id === id ? { ...x, value: newValue } : x))
        );
        // setPage(1); // reset to first page on filter change
    };
    return (
        <div>
            <FilterPanel
                filters={filters}
                onFilterChange={handleFilterChange}
                optionsMap={optionsMap}
                loadDoctors={loadDoctors}
                setPage={setPage}
                exportToExcel={exportToExcel}
                isExcelLoading={isExcelLoading}
            />

            <Row gutter={16} align="top" wrap={false}>
                {isSideBarVisible && (
                    <>
                        <Col flex={`${columnSize}px`}>
                            <FilterSideBar
                                filters={filters}
                                dict={labs}
                                onFilterChange={handleFilterChange}
                                optionsMap={optionsMap}
                                width={columnSize}
                            />
                        </Col>
                    </>
                )}
                {/* right column: table */}
                <Col flex="auto" style={{ overflowX: "auto" }}>
                    <Table
                        dataSource={doctors.items || []}
                        columns={columns}
                        loading={loading}
                        rowKey="cpso_number"
                        pagination={{
                            current: page,
                            pageSize: pageSize,
                            total: totalDoctors,
                            showTotal: (total, range) =>
                                `${range[0]}-${range[1]} of ${total} items`,
                            onChange: (newPage, newPageSize) => {
                                setPage(newPage);
                                setPageSize(newPageSize);

                                // persist the page and pageSize
                                localStorage.setItem("doctorsPage", newPage);
                                localStorage.setItem("doctorsPageSize", newPageSize);
                            },
                        }}
                    />
                </Col>
            </Row>
        </div>
    );
}

