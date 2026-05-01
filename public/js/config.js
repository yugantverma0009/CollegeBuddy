window.CB_API_BASE =
  window.CB_API_BASE ||
  localStorage.getItem('cb_api_base') ||
  `${window.location.origin}/api`;
