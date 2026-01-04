/**
 * TC2 Timeline - Main JavaScript
 * Handles timeline rendering and scroll animations
 */

// ==========================================================================
// Configuration
// ==========================================================================

const IMAGE_BASE_PATH = 'images/updates/';

// ==========================================================================
// Date Formatting
// ==========================================================================

/**
 * Format a date string into a human-readable format
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {string} Formatted date (e.g., "16th of June, 2018")
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('en', { month: 'long' });
  const year = date.getFullYear();

  const suffix = (n) => {
    const j = n % 10;
    const k = n % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  return `${day}${suffix(day)} of ${month}, ${year}`;
}

/**
 * Calculate the time difference from a date to today
 * @param {string} dateString - ISO date string
 * @returns {string} Human-readable time difference
 */
function calculateTimeDifference(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  
  // Set time to midnight for accurate day difference
  date.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = date - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0 && diffDays >= -1) {
    return `<strong>Yesterday</strong>`;
  } else if (diffDays < 0) {
    return `<strong>${Math.abs(diffDays)} days ago</strong>`;
  } else if (diffDays > 0) {
    return `<strong>in ${diffDays} days</strong>`;
  } else {
    return `<strong>Today</strong>`;
  }
}

// ==========================================================================
// Timeline Rendering
// ==========================================================================

/**
 * Render timeline items from data
 * @param {Array} updates - Array of update objects
 */
function renderTimeline(updates) {
  const container = document.getElementById('timeline-items');
  if (!container) {
    console.error('Timeline container not found');
    return;
  }

  updates.forEach((update, index) => {
    const isOdd = index % 2 === 0;
    const timelineItem = document.createElement('div');
    timelineItem.className = `timeline-item ${isOdd ? 'align-left' : 'align-right'}`;

    const daysSince = calculateTimeDifference(update.date);

    timelineItem.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <h3>${update.name}</h3>
        <p>${formatDate(update.date)}</p>
        <p><strong>${daysSince}</strong></p>
        ${update.logo ? `<img src="${IMAGE_BASE_PATH}${update.logo}" alt="${update.name}">` : ''}
      </div>
    `;

    container.appendChild(timelineItem);
  });
}

// ==========================================================================
// Scroll Animations
// ==========================================================================

/**
 * Set up intersection observer for scroll animations
 */
function observeAnimations() {
  const items = document.querySelectorAll('.timeline-content');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      } else {
        entry.target.classList.remove('visible');
      }
    });
  }, { threshold: 0.1 });

  items.forEach(item => observer.observe(item));
}

// ==========================================================================
// Initialization
// ==========================================================================

/**
 * Initialize the timeline
 */
async function init() {
  try {
    // Fetch timeline data
    const response = await fetch('data/updates.json');
    if (!response.ok) {
      throw new Error(`Failed to load updates: ${response.status}`);
    }
    
    const updates = await response.json();
    
    // Render timeline and set up animations
    renderTimeline(updates);
    observeAnimations();
    
  } catch (error) {
    console.error('Failed to initialize timeline:', error);
    
    // Fallback: show error message
    const container = document.getElementById('timeline-items');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger" role="alert">
          Failed to load timeline data. Please refresh the page.
        </div>
      `;
    }
  }
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
