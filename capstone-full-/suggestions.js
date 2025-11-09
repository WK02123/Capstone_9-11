// Suggestions Page JavaScript

// Sample suggestions data
const allSuggestions = [
  {
    id: 1,
    preview: "Milk is nearing its expiry date—suggest launching a limited-time <strong>Latte, mocha, matcha, chocolate</strong>, promotion to boost sales, reduce waste, and encourage quick customer purchases.",
    reason: "8L of milk will expire in 1 day. Historical data shows milk-based drinks have high customer demand.",
    recommendations: [
      "Launch a 'Buy 2 Get 1 Free' promotion for all milk-based beverages",
      "Create a special 'Expiring Soon' menu section with discounted prices",
      "Promote on social media with limited-time offers",
      "Train staff to upsell milk-based drinks to customers"
    ],
    impact: "Estimated reduction of 85% waste, potential sales increase of RM 200-300"
  },
  {
    id: 2,
    preview: "<strong>Coffee beans</strong> inventory is critically low—recommend immediate restocking to avoid menu disruptions and maintain customer satisfaction.",
    reason: "Current stock at 15% capacity. Average daily consumption requires restocking within 2 days to prevent stockout.",
    recommendations: [
      "Place urgent order for 5kg of coffee beans",
      "Contact backup supplier for faster delivery",
      "Consider offering alternative coffee blends temporarily",
      "Set up automated low-stock alerts for future"
    ],
    impact: "Prevents potential revenue loss of RM 500-800 from menu unavailability"
  },
  {
    id: 3,
    preview: "<strong>Salad</strong> shows consistently low sales performance—consider removing from menu or replacing with higher-demand items to optimize kitchen efficiency.",
    reason: "Bottom 3 selling item for 6 consecutive weeks. Food cost ratio of 45% is above target threshold.",
    recommendations: [
      "Survey customers to understand low demand reasons",
      "Test new salad variations with seasonal ingredients",
      "Replace with trending healthy options like poke bowls",
      "Reduce portion sizes and adjust pricing strategy"
    ],
    impact: "Potential to free up 15% of kitchen prep time and reduce food waste by RM 150/week"
  },
  {
    id: 4,
    preview: "<strong>Latte</strong> demand is predicted to increase 15% next week—ensure adequate milk and coffee bean stock to maximize sales opportunities.",
    reason: "AI prediction based on seasonal trends, weather forecast, and historical sales patterns.",
    recommendations: [
      "Increase milk order by 20% for upcoming week",
      "Ensure 2 backup coffee bean suppliers are on standby",
      "Schedule additional barista during peak hours",
      "Prepare promotional materials for latte specials"
    ],
    impact: "Capture additional RM 400-600 in sales with proper inventory preparation"
  }
];

let currentSuggestions = [];
let isLoading = false;

// Load initial suggestions
function loadSuggestions() {
  // Load first 4 suggestions initially
  currentSuggestions = allSuggestions.slice(0, 4);
  renderSuggestions();
}

// Render suggestions to the page
function renderSuggestions() {
  const container = document.getElementById('suggestionsContainer');
  
  if (currentSuggestions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>💡</h3>
        <h3>No Suggestions Available</h3>
        <p>Click "Generate New Suggestions" to get AI-powered recommendations</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = currentSuggestions.map((suggestion, index) => `
    <div class="suggestion-card" id="suggestion-${suggestion.id}" onclick="toggleSuggestion(${suggestion.id})">
      <div class="suggestion-header">
        <div class="suggestion-preview">
          ${suggestion.preview}
        </div>
        <div class="expand-icon">▼</div>
      </div>
      <div class="suggestion-details">
        <div class="suggestion-details-content">
          <div class="detail-section">
            <div class="detail-label">Why this suggestion?</div>
            <div class="detail-value">${suggestion.reason}</div>
          </div>
          <div class="detail-section">
            <div class="detail-label">Recommended Actions</div>
            <ul class="detail-list">
              ${suggestion.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
          <div class="detail-section">
            <div class="detail-label">Expected Impact</div>
            <div class="detail-value">${suggestion.impact}</div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// Toggle suggestion expand/collapse
function toggleSuggestion(id) {
  const card = document.getElementById(`suggestion-${id}`);
  if (card) {
    card.classList.toggle('expanded');
  }
}

// Generate new suggestions
function generateSuggestions() {
  if (isLoading) return;
  
  isLoading = true;
  const container = document.getElementById('suggestionsContainer');
  
  // Show loading state
  container.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <div class="loading-text">Analyzing your data and generating suggestions...</div>
    </div>
  `;
  
  // Simulate AI processing
  setTimeout(() => {
    // Randomly select 4 suggestions from all available
    const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
    currentSuggestions = shuffled.slice(0, 4);
    
    renderSuggestions();
    isLoading = false;
    
    // Show success message
    showNotification('✓ New suggestions generated successfully!');
  }, 1500);
}

// Show notification
function showNotification(message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-weight: 600;
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(notification);
      document.head.removeChild(style);
    }, 300);
  }, 3000);
}

// Add slideOut animation
document.addEventListener('DOMContentLoaded', function() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
});

