const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireEjsAuth: requireLogin } = require('../middleware/auth');

const bhopalDoctors = [
  { name: "Dr. Sangeeta Shrivastava", specialty: "Gynecologist & Obstetrician", hospital: "Hamidia Hospital", address: "Royal Market, Sultania Road, Bhopal", phone: "0755-2540222", area: "Sultania Road" },
  { name: "Dr. Rekha Sachan", specialty: "Gynecologist", hospital: "Bansal Hospital", address: "C-Sector, Shahpura, Bhopal", phone: "0755-4000444", area: "Shahpura" },
  { name: "Dr. Mamta Gupta", specialty: "Gynecologist & Infertility Specialist", hospital: "Chirayu Medical College", address: "Bairagarh, Bhopal", phone: "0755-6677000", area: "Bairagarh" },
  { name: "Dr. Archana Shrivastava", specialty: "Obstetrician & Gynecologist", hospital: "AIIMS Bhopal", address: "Saket Nagar, Bhopal", phone: "0755-2672335", area: "Saket Nagar" },
  { name: "Dr. Preeti Sharma", specialty: "Gynecologist", hospital: "Peoples Hospital", address: "Bhanpur, Bhopal", phone: "0755-4073000", area: "Bhanpur" },
  { name: "Dr. Sunita Rawat", specialty: "Gynecologist & PCOS Specialist", hospital: "Kamla Nehru Hospital", address: "Royal Market, Bhopal", phone: "0755-2550355", area: "Royal Market" },
];

const indoreDoctors = [
  { name: "Dr. Anita Verma", specialty: "Gynecologist", hospital: "MY Hospital", address: "MG Road, Indore", phone: "0731-2527491", area: "MG Road" },
  { name: "Dr. Priya Malhotra", specialty: "PCOS & Fertility Specialist", hospital: "Bombay Hospital", address: "Ring Road, Indore", phone: "0731-4077000", area: "Ring Road" },
];

const cityCoords = {
  bhopal: { lat: 23.2599, lng: 77.4126 },
  indore: { lat: 22.7196, lng: 75.8577 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  delhi:  { lat: 28.6139, lng: 77.2090 },
  pune:   { lat: 18.5204, lng: 73.8567 },
};

function getDoctorsForCity(city) {
  if (!city) return [];
  const c = city.toLowerCase().trim();
  if (c.includes('bhopal')) return bhopalDoctors;
  if (c.includes('indore')) return indoreDoctors;
  return [];
}

function getCoordsForCity(city) {
  if (!city) return null;
  const c = city.toLowerCase().trim();
  for (const [key, val] of Object.entries(cityCoords)) {
    if (c.includes(key)) return val;
  }
  return null;
}

router.get('/', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    const cityQuery = req.query.city || user.city || '';

    if (req.query.city) {
      await User.findByIdAndUpdate(req.session.user.id, { city: req.query.city });
      user.city = req.query.city;
    }

    const clinics = getDoctorsForCity(cityQuery);
    const coords = getCoordsForCity(cityQuery);

    res.render('doctor', {
      user,
      clinics,
      lat: coords ? coords.lat : null,
      lng: coords ? coords.lng : null,
      cityQuery: cityQuery
    });

  } catch (err) {
    console.log(err);
    res.render('doctor', {
      user: req.session.user,
      clinics: [],
      lat: null,
      lng: null,
      cityQuery: ''
    });
  }
});

module.exports = router;