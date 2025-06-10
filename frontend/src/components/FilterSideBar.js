// src/components/FilterSideBar.jsx
import React from 'react';
import { Card, Space, Tag, Typography, Button, List, Tooltip } from 'antd';

export default function FilterSideBar({ filters, dict, onFilterChange, width = 200 }) {
    // function to wrap the value in a tag
    const renderTag = (id, value, v) => {
        if (id === 'labs') {
            return (
                <List
                    size="small"
                    bordered
                    dataSource={[v]}
                    renderItem={(lab) =>
                        lab in dict && (
                            <List.Item
                                key={lab}
                                style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div
                                    style={{
                                        maxWidth: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontWeight: 'bold',
                                    }}
                                    title={lab} // tooltip for full lab name
                                >
                                    {lab}
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '4px',
                                        marginTop: '4px',
                                        width: '100%',
                                    }}
                                >
                                    {dict[lab].map((fsa) => (
                                        <Tag
                                            key={fsa}
                                            color="blue"
                                            style={{
                                                display: 'inline-block',
                                                maxWidth: '100%',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {fsa}
                                        </Tag>
                                    ))}
                                </div>
                            </List.Item>
                        )
                    }
                    locale={{ emptyText: 'None' }}
                />
            );
        }
        return (
            <Tooltip title={v}>
                <Tag
                    style={{
                        display: 'inline-block',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'top',
                    }}
                    color="blue"
                    key={v}
                    closable
                    onClose={() => {
                        const newVal = Array.isArray(value)
                            ? value.filter((x) => x !== v)
                            : '';
                        onFilterChange(id, newVal);
                    }}
                >
                    {v}
                </Tag>
            </Tooltip>
        );
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
                {filters.map(({ id, label, value = [] }) => (
                    <Card
                        key={id}
                        size="small"
                        title={
                            <Typography.Text strong>
                                {label} {value.length > 0 && `(${value.length})`}
                            </Typography.Text>
                        }
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
                        <Space
                            wrap
                            size="small"
                            style={{
                                display: 'block', // key fix!
                                width: '100%',    // key fix!
                            }}
                        >
                            {Array.isArray(value)
                                ? value.map((v) => renderTag(id, value, v))
                                : renderTag(id, value, value)}
                        </Space>
                    </Card>
                ))}
            </Space>
        </div>
    );
}
