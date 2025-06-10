import React, { useState } from 'react';
import { Input, Button, Form, Card, Space, Spin } from 'antd';
import { fetchData, postData } from '../requests/helper';

const ImportCPSOView = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [taskId, setTaskId] = useState(null); // Store task ID if needed

    const onFinish = (values) => {
        console.log('Search Params:', values);
        // Trigger your import logic here (e.g., API call)
        postData('cpso/doctors/import', values, setLoading, (error) => {
            console.error('Error importing CPSO records:', error);
        }).then((response) => {
            if (response) {
                // console.log('Response:', response);
                console.log("Task ID:", response.task_id);
                form.resetFields(); // Reset form fields after successful import
                setTaskId(response.task_id); // Store the task ID
                pollTask(response.task_id); // Start polling for task status
            } else {
                console.error('Import failed');
            }
        });
    };

    const getTaskStatus = async (taskId) => {
        const URL = `cpso/doctors/import/status/${taskId}`;
        const response = fetchData(URL, {}, () => { }, (error) => {
            console.error('Error fetching task status:', error);
        });
        return response;
    };

    const pollTask = (taskId) => {
        const interval = setInterval(async () => {
            try {
                console.log("Polling for task status...");
                const task_data = await getTaskStatus(taskId);
                console.log("Task Data:", task_data);
                const status = task_data.status;
                console.log("Status:", status);
                if (status === "SUCCESS" || status === "FAILURE") {
                    setLoading(false);
                    console.log(`Task ${status.toLowerCase()}`);
                    clearInterval(interval);
                }
            } catch (err) {
                console.error("Polling failed:", err);
                clearInterval(interval);
            }
        }, 500); // poll every 3 seconds
    };



    return (
        <Card title="Import CPSO Records" style={{
            maxWidth: 600,
            margin: 'auto'
        }}>
            <Spin spinning={loading} tip="Importing...">
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ cpsoNumber: '', name: '', specialty: '' }}
                >
                    <Form.Item label="CPSO Number" name="cpso_number">
                        <Input placeholder="Enter CPSO Number" />
                    </Form.Item>

                    <Form.Item label="Postal Code" name="postal_code">
                        <Input placeholder="Enter Postal Code" />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Import
                            </Button>
                            <Button onClick={() => form.resetFields()}>Reset</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Spin>
        </Card>
    );
};

export default ImportCPSOView;
