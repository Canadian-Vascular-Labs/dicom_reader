import React from 'react';
import { LaptopOutlined, NotificationOutlined, UserOutlined } from '@ant-design/icons';
import { Breadcrumb, Layout, Menu, Calendar, theme, Descriptions } from 'antd';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const { Header, Content, Footer, Sider } = Layout;



// Layout component
const DashboardLayout = () => {
    const logout = async () => {
        try {
            console.log("URL: ", `${API_BASE_URL}/api/auth/logout`);
            // Call the backend API to clear the token
            await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true });
            localStorage.removeItem('token');
            navigate('/');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const navigate = useNavigate(); // React router navigation

    const items1 = [
        {
            key: '1',
            label: <Link to="/dashboard/doctors">Doctors View</Link>, // Links to Doctors View
        },
    ];

    const logoutItem = {
        key: 'logout',
        label: 'Logout',
        onClick: logout,
    }

    // const items2 = [UserOutlined, LaptopOutlined, NotificationOutlined].map((icon, index) => {
    //     const key = String(index + 1);
    //     return {
    //         key: `sub${key}`,
    //         icon: React.createElement(icon),
    //         label: `subnav ${key}`,
    //         children: new Array(4).fill(null).map((_, j) => {
    //             const subKey = index * 4 + j + 1;
    //             return {
    //                 key: subKey,
    //                 label: `option${subKey}`,
    //             };
    //         }),
    //     };
    // });

    return (
        <Layout>
            <Header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                <div className="demo-logo" />
                <Menu
                    theme="dark"
                    mode="horizontal"
                    defaultSelectedKeys={['2']}
                    items={items1}
                    style={{
                        flex: 1,
                        minWidth: 0,
                    }}
                />
                <Menu
                    theme="dark"
                    mode="horizontal"
                    defaultSelectedKeys={['1']}
                    items={[logoutItem]}
                    style={{
                        flex: 0,
                    }}
                />
            </Header>
            <Content
                style={{
                    padding: '0 48px',
                }}
            >
                <Breadcrumb
                    style={{
                        margin: '16px 0',
                    }}
                >
                    {/* <Breadcrumb.Item>Home</Breadcrumb.Item>
                    <Breadcrumb.Item>List</Breadcrumb.Item>
                    <Breadcrumb.Item>App</Breadcrumb.Item> */}
                </Breadcrumb>
                <Layout
                    style={{
                        padding: '24px 0',
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                    }}
                >
                    {/* <Sider
                        style={{
                            background: colorBgContainer,
                        }}
                        width={200}
                    >
                        <Menu
                            mode="inline"
                            defaultSelectedKeys={['1']}
                            defaultOpenKeys={['sub1']}
                            style={{
                                height: '100%',
                            }}
                            // items={items2}
                        />
                    </Sider> */}
                    <Content
                        style={{
                            padding: '0 24px',
                            minHeight: 280,
                        }}
                    >
                        {/* Dynamic content will be rendered here */}
                        <Outlet />
                    </Content>
                </Layout>
            </Content>
            <Footer
                style={{
                    textAlign: 'center',
                }}
            >
                Ant Design ©{new Date().getFullYear()} Created by Ant UED
            </Footer>
        </Layout>
    );
};


export default DashboardLayout;