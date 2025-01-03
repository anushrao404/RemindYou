// Show the loading overlay on page load
window.addEventListener('load', function() {
    document.getElementById('loading-overlay').style.display = 'none'; // Hide the loader
  });
  
  // Optionally show the loader if page is taking time to load
  window.addEventListener('beforeunload', function() {
    document.getElementById('loading-overlay').style.display = 'flex'; // Show the loader
  });
  