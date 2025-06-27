import React from 'react'
import { useState, useEffect } from 'react';

// fake data for certifications for now
const certifications = [
    { id: 1, name: 'Certified React Developer', issuedBy: 'React Academy', dateIssued: '2023-01-15' },
    { id: 2, name: 'Certified JavaScript Developer', issuedBy: 'JavaScript Institute', dateIssued: '2023-02-20' },
    { id: 3, name: 'Certified Frontend Developer', issuedBy: 'Frontend Masters', dateIssued: '2023-03-10' }
];

const EmployeeView = () => {


    // fetch certifications from backend
    // const [certifications, setCertifications] = useState([]);


    return (
        <div>
            <h1>Employee View</h1>
            <p>This is the employee view page.</p>
            {/* Add more content or components as needed */}
            {certifications.length > 0 ? (
                <div>
                    <h2>Certifications</h2>
                    <ul>
                        {certifications.map(cert => (
                            <li key={cert.id}>
                                <strong>{cert.name}</strong> - Issued by {cert.issuedBy} on {cert.dateIssued}
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

export default EmployeeView
