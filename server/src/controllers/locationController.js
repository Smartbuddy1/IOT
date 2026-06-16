import pool from '../config/db.js';

const FALLBACK_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir'
];
const FALLBACK_DISTRICTS = {
  'Maharashtra': ['Pune', 'Mumbai', 'Nashik', 'Nagpur', 'Aurangabad', 'Thane'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi'],
  // Added a default fallback for ANY state that doesn't have a specific list
};
const FALLBACK_CITIES = {
  'Pune': ['Pune City', 'Pimpri-Chinchwad'],
  'Mumbai': ['Mumbai City', 'Navi Mumbai', 'Andheri'],
  'Ahmedabad': ['Ahmedabad City'],
  'Bangalore': ['Bangalore City']
};

export const getStates = async (req, res) => {
  try {
    const [states] = await pool.query('SELECT DISTINCT state FROM cities ORDER BY state ASC');
    if (states.length > 0) {
      res.json({ success: true, data: states.map(s => s.state).filter(Boolean) });
    } else {
      res.json({ success: true, data: FALLBACK_STATES });
    }
  } catch (error) {
    res.json({ success: true, data: FALLBACK_STATES });
  }
};

export const getDistricts = async (req, res) => {
  const { state } = req.params;
  try {
    const [districts] = await pool.query('SELECT DISTINCT district FROM cities WHERE state = ? ORDER BY district ASC', [state]);
    if (districts.length > 0) {
      res.json({ success: true, data: districts.map(d => d.district).filter(Boolean) });
    } else {
      res.json({ success: true, data: FALLBACK_DISTRICTS[state] || ['Default District'] });
    }
  } catch (error) {
    res.json({ success: true, data: FALLBACK_DISTRICTS[state] || ['Default District'] });
  }
};

export const getCities = async (req, res) => {
  const { district } = req.params;
  try {
    const [cities] = await pool.query('SELECT DISTINCT city FROM cities WHERE district = ? ORDER BY city ASC', [district]);
    if (cities.length > 0) {
      res.json({ success: true, data: cities.map(c => c.city).filter(Boolean) });
    } else {
      res.json({ success: true, data: FALLBACK_CITIES[district] || ['Default City'] });
    }
  } catch (error) {
    res.json({ success: true, data: FALLBACK_CITIES[district] || ['Default City'] });
  }
};
