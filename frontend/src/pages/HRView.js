import React from 'react'
import { useState, useEffect } from 'react';
import { fetchData } from '../requests/helper';

const HRView = () => {
    const [certifications, setCertifications] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchCertifications = async () => {
            try {
                // const data = await fetchData("cpso/specialties", {}, setLoading, () => { });
                const data = await fetchData('certification_tracking/certifications', {}, setLoading); // Adjust the endpoint as needed
                setCertifications(data);
            } catch (error) {
                console.error('Error fetching certifications:', error);
            }
        };

        fetchCertifications();
    }, []);

    console.log('Certifications:', certifications);

    return (
        <div>
            <h1>HR View</h1>
            {certifications.length > 0 ? (
                <div>
                    <h2>Certifications</h2>
                    {loading && <p>Loading...</p> /* Show loading state if needed */}
                    <ul>
                        {certifications.map(cert => (
                            <li key={cert.id}>
                                <strong>{cert} </strong>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p>No certifications found.</p>
            )}
        </div>
    )
}

export default HRView
