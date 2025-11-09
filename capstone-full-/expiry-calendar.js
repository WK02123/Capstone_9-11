// --- Enhanced GastroTrack Expiry Calendar JS ---

// DOM element references
const calendarGrid = document.querySelector('.calendar-grid');
const alertsContainer = document.querySelector('.alerts-grid');
const calendarHeader = document.querySelector('.calendar-header h1');
const prevBtn = document.querySelector('.nav-btn:first-of-type'); // Previous button
const nextBtn = document.querySelector('.nav-btn:nth-of-type(2)'); // Next button
const refreshBtn = document.querySelector('.nav-btn:last-of-type'); // Refresh button

// Current date state
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// API configuration
const API_CONFIG = {
    expiryData: 'http://localhost:5000/api/expiry-data',
    inventoryStats: 'http://localhost:5000/api/inventory/stats',
    health: 'http://localhost:5000/api/health'
};

// --- Build calendar grid for a given month/year ---
function buildCalendar(month, year) {
    if (!calendarGrid) {
        console.error('Calendar grid element not found');
        return;
    }

    // Clear existing calendar content (but preserve day headers)
    const existingDays = calendarGrid.querySelectorAll('.calendar-day');
    existingDays.forEach(day => day.remove());

    // Set month-year header
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    if (calendarHeader) {
        calendarHeader.textContent = `${monthNames[month]} ${year}`;
    }

    // First day of month and month info
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const div = document.createElement('div');
        div.className = 'calendar-day other-month';
        div.textContent = prevMonthDays - i;
        calendarGrid.appendChild(div);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        div.textContent = day;

        const dateKey = `${year}-${month + 1}-${day}`; // YYYY-M-D format
        div.dataset.date = dateKey;

        // Highlight today
        const today = new Date();
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            div.classList.add('today');
        }

        // Container for expiring items (for tooltips/details)
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'day-items';
        itemsContainer.style.display = 'none'; // Hidden by default
        div.appendChild(itemsContainer);

        // Add click event for day selection
        div.addEventListener('click', () => {
            // Remove previous selection
            document.querySelectorAll('.calendar-day.selected').forEach(el => {
                el.classList.remove('selected');
            });
            div.classList.add('selected');
            
            // Show items for selected date
            showDateDetails(dateKey);
        });

        calendarGrid.appendChild(div);
    }

    // Next month's leading days to complete the grid
    const totalDays = calendarGrid.querySelectorAll('.calendar-day').length;
    const remainingCells = totalDays % 7 === 0 ? 0 : 7 - (totalDays % 7);
    
    for (let i = 1; i <= remainingCells; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day other-month';
        div.textContent = i;
        calendarGrid.appendChild(div);
    }

    // Load expiry data for this month
    fetchExpiryData();
}

// --- Fetch expiry data from Python Flask API ---
async function fetchExpiryData() {
  try {
    const response = await fetch('/api/expiry-data');   // <-- Your Flask route
    if (!response.ok) {
      throw new Error('Server returned an error');
    }

    const data = await response.json();
    expiryData = data.calendarData || {};
    expiryAlerts = data.alertsData || [];

    renderCalendar(currentMonth, currentYear);
    renderExpiryAlerts();

  } catch (error) {
    console.error('Failed to fetch expiry data:', error);
    document.querySelector('.alerts-grid').innerHTML = `
      <p style="color:red; font-weight:600;">Unable to load expiry data. Ensure backend is running.</p>
    `;
  }
}

// --- Populate alerts section ---
function populateAlertsSection(alertsData) {
    if (!alertsContainer) {
        console.error('Alerts container not found');
        return;
    }

    alertsContainer.innerHTML = '';

    if (alertsData.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'expiry-item expiry-caution';
        emptyDiv.innerHTML = '<div class="expiry-content">No expiring items found</div>';
        alertsContainer.appendChild(emptyDiv);
        return;
    }

    // Sort alerts by priority and days until expiry
    const sortedAlerts = alertsData.sort((a, b) => {
        const priorityOrder = { 'critical': 0, 'warning': 1, 'caution': 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.daysUntil - b.daysUntil;
    });

    sortedAlerts.forEach(item => {
        const div = document.createElement('div');
        div.className = `expiry-item expiry-${item.priority}`;
        div.innerHTML = `
            <div class="expiry-content">
                <strong>${item.item} (${item.quantity})</strong> expiring in <strong>${item.daysUntil} day(s)</strong> (${item.expiryDate})
            </div>
        `;
        alertsContainer.appendChild(div);
    });

    // Fill remaining slots to maintain grid layout
    const maxSlots = 8;
    const remainingSlots = maxSlots - sortedAlerts.length;
    for (let i = 0; i < remainingSlots; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'expiry-item expiry-caution';
        emptyDiv.innerHTML = '<div class="expiry-content"></div>';
        alertsContainer.appendChild(emptyDiv);
    }
}

// --- Add tooltip to calendar days ---
function addTooltip(dayElement, items) {
    dayElement.title = items.map(item => 
        `${item.item} (${item.quantity}) - ${item.daysUntil} day(s) left`
    ).join('\n');
}

// --- Show details for selected date ---
function showDateDetails(dateKey) {
    // This could open a modal or sidebar with detailed information
    console.log(`Selected date: ${dateKey}`);
    // Future enhancement: Show detailed view of items for this date
}

// --- Loading and error states ---
function showLoadingState(isLoading) {
    if (calendarHeader) {
        if (isLoading) {
            calendarHeader.style.opacity = '0.6';
        } else {
            calendarHeader.style.opacity = '1';
        }
    }
}

function showErrorMessage(message) {
    if (alertsContainer) {
        alertsContainer.innerHTML = `
            <div class="expiry-item expiry-warning">
                <div class="expiry-content"><strong>⚠️ Error:</strong> ${message}</div>
            </div>
        `;
    }
}

// --- Navigation event listeners ---
if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        buildCalendar(currentMonth, currentYear);
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        buildCalendar(currentMonth, currentYear);
    });
}

// --- Refresh button ---
if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
        fetchExpiryData();
    });
}

// --- Health check on startup ---
async function checkAPIHealth() {
    try {
        const response = await fetch(API_CONFIG.health);
        const data = await response.json();
        console.log('✅ API Health Check:', data.status);
        return true;
    } catch (err) {
        console.warn('⚠️ API Health Check Failed:', err.message);
        return false;
    }
}

// --- Initialize calendar ---
function initializeCalendar() {
    console.log('🔥 Initializing GastroTrack Expiry Calendar...');
    
    // Check API health
    checkAPIHealth();
    
    // Build initial calendar
    buildCalendar(currentMonth, currentYear);
    
    console.log('✅ Calendar initialized successfully');
}

// --- Enhanced styling ---
const enhancedStyles = document.createElement('style');
enhancedStyles.textContent = `
    .calendar-day.selected {
        background: rgba(255, 255, 255, 0.4) !important;
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.6) !important;
        transform: scale(1.05);
    }
    
    .calendar-day.has-expiry {
        position: relative;
    }
    
    .calendar-day.has-expiry::after {
        content: '';
        position: absolute;
        bottom: 4px;
        left: 50%;
        transform: translateX(-50%);
        width: 6px;
        height: 6px;
        border-radius: 50%;
        box-shadow: 0 0 0 2px var(--color-calendar-bg);
    }
    
    .calendar-day.expiry-critical::after {
        background: var(--color-critical, #d93e3e);
    }
    
    .calendar-day.expiry-warning::after {
        background: var(--color-warning, #f1c43a);
    }
    
    .calendar-day.expiry-caution::after {
        background: var(--color-caution, #e8e8e8);
    }
    
    .calendar-day:hover {
        background: rgba(255, 255, 255, 0.25) !important;
        transform: scale(1.05);
        transition: all 0.2s ease;
    }
    
    .day-items {
        position: absolute;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 4px;
    }
`;
document.head.appendChild(enhancedStyles);

// --- Start the application ---
document.addEventListener('DOMContentLoaded', initializeCalendar);

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initializeCalendar();
}

