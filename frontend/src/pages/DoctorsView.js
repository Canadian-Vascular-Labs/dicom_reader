// src/components/DoctorsView.jsx

import React, { useState, useEffect, use } from "react";
import {
    Descriptions,
    Button,
    Select,
    Input,
    Space,
    Tag,
    Table,
    List,
    Row,
    Col,
    Typography,
} from "antd";

import { fetchData } from "../requests/helper";
import { useNavigate } from "react-router-dom";

const { Option } = Select;

// filterable fields
const filterOptions = [
    { value: "labfilter", label: "Filter by Lab" },
    { value: "fsa", label: "Filter by FSA" },
    { value: "specialties", label: "Filter by Specialties" },
    { value: "name", label: "Filter by Name" },
    { value: "inMailinglist", label: "Filter by Mailing List" },
];

// load labs
// labs are dictionaries withing the dictionary with primary key: "LabFSAs"
const { LabFSAs: labDict } = require("../data/fsa.json");

// load list of all specialties and FSAs
const { specialties: allSpecs } = require("../data/specialties.json");
const specialtyOptions = allSpecs.map((s) => ({ value: s, label: s }));
// add select all to the specialties
specialtyOptions.unshift({ value: "Select All", label: "Select All" });

const { FSAs: allFSA } = require("../data/fsa.json");
const fsaOptions = allFSA.map((f) => ({ value: f, label: f }));

// columns to be displayed in the table
const columns = [
    {
        title: "CPSO Number",
        dataIndex: "cpsonumber",
        key: "cpsonumber",
        width: 150,
        ellipsis: true,
    },
    { title: "Name", dataIndex: "name", key: "name", width: 200, ellipsis: true },
    {
        title: "Specialties",
        dataIndex: "specialties",
        key: "specialties",
        width: 150,
        ellipsis: true,
    },
    {
        title: "Street1",
        dataIndex: "street1",
        key: "street1",
        width: 200,
        ellipsis: true,
    },
    {
        title: "Street2",
        dataIndex: "street2",
        key: "street2",
        width: 150,
        ellipsis: true,
    },
    {
        title: "Street3",
        dataIndex: "street3",
        key: "street3",
        width: 150,
        ellipsis: true,
    },
    {
        title: "Street4",
        dataIndex: "street4",
        key: "street4",
        width: 150,
        ellipsis: true,
    },
    { title: "City", dataIndex: "city", key: "city", width: 120, ellipsis: true },
    {
        title: "Province",
        dataIndex: "province",
        key: "province",
        width: 100,
        ellipsis: true,
    },
    {
        title: "Postal Code",
        dataIndex: "postalcode",
        key: "postalcode",
        width: 100,
        ellipsis: true,
    },
    {
        title: "Phone Number",
        dataIndex: "phonenumber",
        key: "phonenumber",
        width: 130,
        ellipsis: true,
    },
    { title: "Fax", dataIndex: "fax", key: "fax", width: 130, ellipsis: true },
    {
        title: "Registration Status",
        dataIndex: "registrationstatuslabel",
        key: "registrationstatuslabel",
        width: 120,
        ellipsis: true,
    },
];

export default function DoctorsView() {
    const savedPage = Number(localStorage.getItem("doctorsPage")) || 1;
    const savedPageSize = Number(localStorage.getItem("doctorsPageSize")) || 50;

    const [isDownloading, setIsDownloading] = useState(false);
    const [page, setPage] = useState(savedPage);
    const [pageSize, setPageSize] = useState(savedPageSize);
    const [totalDoctors, setTotalDoctors] = useState(0);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterValues, setFilterValues] = useState({
        labfilter: [],
        fsa: [],
        specialties: [],
        name: "",
        inMailinglist: [],
    });

    // initialize specialties to filter for all specialties
    const [labFSAVals, setLabFSAVals] = useState([]);

    const navigate = useNavigate();

    //
    useEffect(() => {
        // set select all for default
        setFilterValues((fv) => ({
            ...fv,
            specialties: specialtyOptions.map((s) => s.value),
        }));
    }, []);

    // change so name filter isnt sent to the backend
    // fetch once
    useEffect(() => {
        // fetchData("doctors/cpso", setCpsoNumbers, setLoading, navigate);
        fetchData(
            `doctors?page=${page}&pageSize=${pageSize}&filters=${JSON.stringify(
                filterValues
            )}`,
            setLoading,
            navigate
        ).then((response) => {
            setDoctors(response["data"]);
            setTotalDoctors(response["total"]);
            setPageSize(response["pageSize"] ?? 50);
        });

        // // set select all for default
        // setFilterValues((fv) => ({
        //     ...fv,
        //     specialties: specialtyOptions.map((s) => s.value),
        // }));
    }, [navigate, page, pageSize, filterValues]);

    // use effect to destructure the doctors array
    useEffect(() => {
        // if (doctors['data'].length > 0) {
        // set the doctors array to the data array
        console.log("doctors", doctors);
        console.log("array:", doctors["data"]);
        // }
    }, [doctors]);

    // use effect to update FSA options when labfilter changes
    useEffect(() => {
        // if labfilter is selected, filter the FSAs
        const selectedLabs = filterValues.labfilter;
        if (selectedLabs.length) {
            const selectedFSA = selectedLabs.flatMap((lab) => labDict[lab]);
            // update the fsaOptions state
            setLabFSAVals(selectedFSA);
        } else {
            // if no labfilter is selected, reset the fsaOptions
            setLabFSAVals([]);
        }
    }, [filterValues.labfilter]);

    // use effect to update specialties when select_all is selected
    useEffect(() => {
        // if select_all is selected, set all specialties
        if (filterValues.specialties.includes("Select All")) {
            setFilterValues((fv) => ({
                ...fv,
                specialties: specialtyOptions.map((s) => s.value),
            }));
        }
        // if all specialties are selected, remove select_all
        if (filterValues.specialties.length === specialtyOptions.length) {
            setFilterValues((fv) => ({
                ...fv,
                specialties: fv.specialties.filter((s) => s !== "Select All"),
            }));
        }
    }, [filterValues.specialties]);

    const sortedLabs = React.useMemo(() => {
        return [...filterValues.labfilter].sort((a, b) => a.localeCompare(b));
    }, [filterValues.labfilter]);

    const labKeys = React.useMemo(() => {
        if (!filterValues.fsa.length) {
            return sortedLabs;
        }
        return [...sortedLabs, "Filtered FSAs"];
    }, [sortedLabs, filterValues.fsa]);

    const labDictCopy = React.useMemo(() => {
        const copy = {};
        // copy all the real labs
        Object.entries(labDict).forEach(([lab, fsas]) => {
            copy[lab] = [...fsas];
        });
        // only add this one if we have any
        if (filterValues.fsa.length) {
            copy["Filtered FSAs"] = [...filterValues.fsa];
        }
        return copy;
    }, [filterValues.fsa]);

    // ensure only one of True/False is selected for inMailinglist
    useEffect(() => {
        const selected = filterValues.inMailinglist;
        if (selected.length > 1) {
            setFilterValues((fv) => ({
                ...fv,
                inMailinglist: [selected[selected.length - 1]],
            }));
        }
    }, [filterValues.inMailinglist]);


    // helper: returns the doctors array filtered _only_ by all fields except `skipField`
    const doctorsMatchingOtherFilters = (skipField) => {
        return doctors.filter((doc) =>
            filterOptions
                .map((o) => o.value)
                .filter((f) => f !== "name" && f !== "labfilter" && f !== skipField)
                .every((field) => {
                    const selected = filterValues[field] || [];
                    if (!selected.length) return true;
                    const usePostalCode = field === "fsa" || field === "labfilter";
                    const cell = (doc[usePostalCode ? "postalcode" : field] || "")
                        .toString()
                        .toLowerCase();
                    return selected.some((val) => cell.includes(val.toLowerCase()));
                })
        );
    };

    // build the options for a given field by looking only at doctorsMatchingOtherFilters(field)
    const getOptionsFor = (field) => {
        if (field === "labfilter") {
            // return the keys of the labDict
            return Object.keys(labDict).map((lab) => ({
                value: lab,
                label: lab,
            }));
        }
        if (field === "inMailinglist")
            return ["True", "False"].map((v) => ({ value: v, label: v }));
        if (field === "specialties") return specialtyOptions;
        if (field === "fsa") return fsaOptions;
        // for name, or any other dynamic field:
        const subset = doctorsMatchingOtherFilters(field); // this ensures we only look at the filtered doctors when we search by  name
        const allVals = Array.from(
            new Set(subset.map((d) => (d[field] || "").trim()).filter((v) => v))
        );
        return allVals.map((v) => ({ value: v, label: v }));
    };

    // CSV‐download

    // define exportToExcel function
    const exportToExcel = () => {
        if (!doctors.length) return;
        setIsDownloading(true);

        // 1) gather all the keys
        const tableFields = columns.map((c) => c.dataIndex);
        const extraFields = Array.from(
            new Set(
                doctors.flatMap((doc) =>
                    Object.keys(doc).filter((k) => !tableFields.includes(k))
                )
            )
        );
        // query the backend for all the data matching the filters
        fetchData(
            `doctors?filters=${JSON.stringify(filterValues)}`,
            setLoading,
            navigate
        ).then((response) => {
            console.log("response", response);
            const allDoctors = response["data"];
            const totalDoctors = response["total"];
            console.log(`Fetched ${totalDoctors} doctors for export: ${allDoctors}`);

            // 2) final ordered list of all fields
            const allFields = [...tableFields, ...extraFields];

            // 3) header row: column titles (for the table fields) + raw key names (for extras)
            const header = [
                ...columns.map((c) => `"${c.title.replace(/"/g, '""')}"`),
                ...extraFields.map((f) => `"${f.replace(/"/g, '""')}"`),
            ].join(",");

            // 4) build each data row
            const rows = allDoctors.map((doc) =>
                allFields
                    .map((field) => {
                        let val = doc[field];

                        // if it's an object/array, stringify it
                        if (typeof val === "object") {
                            val = JSON.stringify(val);
                        }
                        if (field === "phonenumber" || field === "fax") {
                            // if it's a phone number, make sure no formatting is applied -- just the raw number
                            val = val.replace(/[^0-9]/g, "");
                        }

                        // normalize undefined/null → empty string
                        val = val == null ? "" : val;

                        // escape any quotes/newlines
                        const escaped = String(val).replace(/"/g, '""');
                        return `"${escaped}"`;
                    })
                    .join(",")
            );

            // 5) assemble CSV and trigger download
            const csvContent = [header, ...rows].join("\r\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", "doctors_data.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).finally(() => {
            setIsDownloading(false);
        }
        );
    };
    const totalWidth = columns.reduce((sum, c) => sum + (c.width || 100), 0);

    // check if any of the filter values are selected
    const anyFilterSelected = Object.values(filterValues).some(
        (vals) => vals.length > 0
    );

    return (
        <div>
            <Descriptions title="Doctors View" />

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                    width: "100%",
                }}
            >
                <Space wrap size="middle">
                    {filterOptions.map(({ value: field, label }) => {
                        if (field === "name") {
                            return (
                                <Input
                                    key={field}
                                    placeholder={label}
                                    style={{ minWidth: 200 }}
                                    allowClear
                                    value={filterValues[field] ?? ""}
                                    onChange={(e) =>
                                        setFilterValues((fv) => ({
                                            ...fv,
                                            [field]: e.target.value,
                                        }))
                                    }
                                />
                            )
                        } else {
                            return (
                                <Select
                                    key={field}
                                    mode="multiple"
                                    allowClear
                                    showSearch
                                    placeholder={label}
                                    style={{ minWidth: 200 }}
                                    maxTagCount={2}
                                    disabled={field === "name"}
                                    options={getOptionsFor(field)}
                                    value={filterValues[field]}
                                    onChange={(vals) =>
                                        setFilterValues((fv) => ({ ...fv, [field]: vals }))
                                    }
                                    filterOption={(input, opt) =>
                                        opt.label.toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                            );
                        }
                    })}
                </Space>

                <Button
                    type="primary"
                    onClick={exportToExcel} // whatever your CSV/Excel helper is
                    style={{ marginLeft: 16 }}
                    loading={isDownloading}
                >
                    Export to Excel
                </Button>
            </div>

            <Row gutter={16} align="top" wrap={false}>
                {/* left column: FSAs */}
                {anyFilterSelected ? (
                    <>
                        <Col flex="200px">
                            {/* show the selected labs and FSAs */}
                            {filterValues.labfilter.length > 0 ||
                                filterValues.fsa.length > 0 ? (
                                <>
                                    <Typography.Title level={5}>
                                        Filtered Labs/FSAs
                                    </Typography.Title>
                                    {/* inside the list for the lab, show the FSAs connected to it */}
                                    <List
                                        size="small"
                                        bordered
                                        // append FSAs to the the dataSource
                                        dataSource={labKeys}
                                        renderItem={(lab) => (
                                            <List.Item>
                                                {lab}
                                                <List style={{ marginLeft: 8 }}>
                                                    {labDictCopy[lab].map((fsa) => (
                                                        <Tag key={fsa} color="blue">
                                                            {fsa}
                                                        </Tag>
                                                    ))}
                                                </List>
                                            </List.Item>
                                        )}
                                        locale={{ emptyText: "None" }}
                                    />
                                </>
                            ) : null}

                            {/* filtered specialties */}
                            {filterValues.specialties.length > 0 ? (
                                <>
                                    <Typography.Title style={{ marginTop: 16 }} level={5}>
                                        Filtered Specialties
                                    </Typography.Title>
                                    <List
                                        size="small"
                                        bordered
                                        dataSource={filterValues.specialties.sort()}
                                        renderItem={(spec) => (
                                            <List.Item
                                                style={{
                                                    // padding: 1,                // reset the List.Item’s own padding
                                                    // marginLeft: 18,            // add a little left-gap
                                                    border: "none", // hide the inner item borders
                                                }}
                                            >
                                                <Tag color="blue">{spec}</Tag>
                                            </List.Item>
                                        )}
                                        locale={{ emptyText: "None" }}
                                        style={{
                                            overflowY: "auto", // enable vertical scroll
                                        }}
                                    />
                                </>
                            ) : null}

                            {/* filtered names */}
                            {filterValues.name > 1 ? (
                                <>
                                    <Typography.Title style={{ marginTop: 16 }} level={5}>
                                        Filtered Names
                                    </Typography.Title>
                                    <List
                                        size="small"
                                        bordered
                                        dataSource={filterValues.name.sort()}
                                        renderItem={(name) => (
                                            <List.Item
                                                style={{
                                                    // padding: 1,                // reset the List.Item’s own padding
                                                    // marginLeft: 18,            // add a little left-gap
                                                    border: "none", // hide the inner item borders
                                                }}
                                            >
                                                <Tag color="blue">{name}</Tag>
                                            </List.Item>
                                        )}
                                        locale={{ emptyText: "None" }}
                                        style={{
                                            overflowY: "auto", // enable vertical scroll
                                        }}
                                    />
                                </>
                            ) : null}
                        </Col>
                    </>
                ) : null}
                {/* right column: table */}
                {true && (
                    <Col flex="auto" style={{ overflowX: "auto" }}>
                        <Table
                            dataSource={doctors}
                            columns={columns}
                            loading={loading}
                            rowKey="cpsonumber"
                            pagination={{
                                current: page,
                                pageSize: pageSize,
                                total: totalDoctors,
                                showTotal: (total, range) =>
                                    `${range[0]}-${range[1]} of ${total} items`,
                                onChange: (newPage, newPageSize) => {
                                    setPage(newPage);
                                    setPageSize(newPageSize);
                                    // persist when refreshing
                                    localStorage.setItem("doctorsPage", newPage);
                                    localStorage.setItem("doctorsPageSize", newPageSize);
                                },
                            }}
                            // still let the table itself handle wide content
                            scroll={{ x: totalWidth }}
                        />
                    </Col>
                )}
            </Row>
        </div>
    );
}
