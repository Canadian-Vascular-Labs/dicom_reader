// src/components/FilterSideBar.jsx
import React from 'react';
import { Card, Space, Tag, Typography, Button, List } from 'antd';
import { render } from '@testing-library/react';

export default function FilterSideBar({ filters, dict, onFilterChange, width = 200 }) {
    // console.log("FilterSideBar filters:", filters);
    // console.log("FilterSideBar dict:", dict);


    // function to wrap the value in a tag
    const renderTag = (id, value, v) => {
        if (id === 'labs') {
            return (
                <List
                    size="small"
                    bordered
                    dataSource={[v]}
                    renderItem={(lab) => (
                        lab in dict && (
                            <List.Item>
                                {lab}
                                <List style={{ marginLeft: 8 }}>
                                    {dict[lab].map((fsa) => (
                                        <Tag key={fsa} color="blue">
                                            {fsa}
                                        </Tag>
                                    ))}
                                </List>
                            </List.Item>
                        )
                    )
                    }
                    locale={{ emptyText: "None" }}
                />

            )
        }
        return (
            <Tag
                color='blue'
                key={v} closable onClose={() => {
                    const newVal = Array.isArray(value)
                        ? value.filter(x => x !== v)
                        : '';
                    onFilterChange(id, newVal);
                }}>
                {v}
            </Tag>)
    };

    return (
        <div
            style={{
                width,
                maxHeight: '80vh',
                overflowY: 'auto',
                paddingRight: 8,
            }}
        >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {filters.map(({ id, label, value = [] }) => {
                    if (value.length === 0) return null;
                    return (
                        <Card
                            key={id}
                            size="small"
                            title={
                                <Typography.Text strong>
                                    {label} {value.length > 0 && `(${value.length})`}
                                </Typography.Text>
                            }
                            // make sure the text does not overflow
                            // style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                            extra={
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={() => onFilterChange(id, id === 'name' ? '' : [])}
                                >
                                    Clear
                                </Button>
                            }
                        >
                            <Space wrap size="small">
                                {Array.isArray(value) ?
                                    value?.map((v) => {
                                        return renderTag(id, value, v)
                                    }) :
                                    renderTag(id, value, value)}
                            </Space>
                        </Card>
                    )
                })}
            </Space>
        </div>
    );
}
