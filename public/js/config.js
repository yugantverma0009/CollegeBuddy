window.CB_API_BASE =
  window.CB_API_BASE ||
  localStorage.getItem('cb_api_base') ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://collegebuddy-backend.onrender.com/api');
