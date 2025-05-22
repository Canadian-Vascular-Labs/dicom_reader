const Doctor = require('../models/doctor');
const express = require('express');
const authenticateJWT = require('../middlewares/authMiddleware');
const router = express.Router();

// Create a new doctor
router.post('/doctors', authenticateJWT, async (req, res) => {
    try {
        // NOSQL Injection Vulnerability
        // use validation middleware to prevent this
        // need to split the specialties into array
        const doctor = new Doctor(req.body);
        await doctor.save();
        res.status(201).json(doctor);
    } catch (error) {
        res.status(400).json({ message: 'Error creating doctor', error });
    }
});

// // Get all doctors
// router.get('/doctors', authenticateJWT, async (req, res) => {
//     try {
//         console.log("Retrieving doctors");
//         const doctors = await Doctor
//             .find({})                 // no filter → all docs
//             .sort({ name: 1 })        // optional: alphabetical
//             .lean();
//         // log the MB for the response
//         console.log("Response MB: ", JSON.stringify(doctors).length / 1000000);

//         res.status(200).json(doctors);
//     } catch (error) {
//         res.status(510).json({ message: 'Error retrieving doctors', error });
//     }
// });

// GET /api/doctors?filters={…}&page=1&pageSize=50
router.get('/doctors', authenticateJWT, async (req, res, next) => {
    try {
        // if page and pagsize are not provided, return all since it's an export query
        const { page = -1, pageSize = -1, filters: filtersJson } = req.query;
        const skip = (Number(page) - 1) * Number(pageSize);
        const limit = Number(pageSize);

        // 1) Parse your filters JSON (or default to empty)
        let uiFilters = {};
        try {
            uiFilters = filtersJson ? JSON.parse(filtersJson) : {};
        } catch (e) {
            return res.status(400).json({ error: 'Invalid filters parameter' });
        }

        // 2) Build a mongoFilter object
        const mongoFilter = {};

        // — 2a) Specialty(s) (array membership)
        if (uiFilters.specialties?.length) {
            // drop “Select All” if present
            const specs = uiFilters.specialties.filter(s => s !== 'Select All');
            if (specs.length) {
                mongoFilter.specialties = { $in: specs };
            }
        }

        // — 2b) Mailing-list flag
        if (uiFilters.inMailinglist?.length) {
            // your front-end uses strings “True”/“False”
            const boolVal = uiFilters.inMailinglist[0] === 'True';
            mongoFilter.inMailinglist = boolVal;
        }

        // — 2c) FSA or lab-based postal codes
        if (uiFilters.labfilter?.length || uiFilters.fsa?.length) {
            // import your lab→FSA map
            const { LabFSAs: labDict } = require('../../frontend/src/data/fsa.json');
            // collect all FSAs from labs, plus any individually selected
            const labFSAs = (uiFilters.labfilter || [])
                .flatMap(lab => labDict[lab] || []);
            const extraFSAs = uiFilters.fsa || [];
            const allFSAs = Array.from(new Set([...labFSAs, ...extraFSAs]));

            if (allFSAs.length) {
                // match any postalcode that starts with one of these FSAs
                mongoFilter.postalcode = {
                    $in: allFSAs.map(fsa => new RegExp(`^${fsa}`, 'i'))
                };
            }
        }

        // — 2d) Name search
        if (uiFilters.name?.length) {
            mongoFilter.name = {
                $regex: uiFilters.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                $options: 'i'
            };
        }
        console.log('Mongo filter:', mongoFilter);


        // 3) Run the count + paged find
        const [total, docs] = await Promise.all([
            Doctor.countDocuments(mongoFilter),
            Doctor.find(mongoFilter)
                .sort({ name: 1 })
                .skip(skip > 0 ? skip : 0) // skip only if page > 1
                .limit(limit > 0 ? limit : 0) // limit only if pageSize > 0
                .lean(),
        ]);

        // 4) Return the page
        res.json({
            data: docs,
            total,
            page: Number(page),
            pageSize: Number(pageSize),
        });
    } catch (err) {
        next(err);
    }
});


module.exports = router;