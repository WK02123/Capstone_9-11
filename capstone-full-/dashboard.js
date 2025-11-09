  // --- 1. Load Sales Data from Backend ---
  async function loadSalesData() {
    try {
      const res = await fetch("http://127.0.0.1:5000/api/sales"); // Flask endpoint
      if (!res.ok) throw new Error("Failed to fetch sales data");
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Error loading sales data:", err);
      return { labels: [], datasets: [] };
    }
  }

  // --- 2. Render Chart (Dynamic + Data-Driven) ---
  let salesChart; // Store chart instance for later updates

  async function renderChart() {
    const ctxEl = document.getElementById("salesChart");
    if (!ctxEl) return;

    const data = await loadSalesData();

    // Destroy existing chart to prevent overlap
    if (salesChart) salesChart.destroy();

    salesChart = new Chart(ctxEl, {
      type: "line",
      data: {
        labels: data.labels, // Example: ['Aug', 'Sept', 'Oct']
        datasets: data.datasets.map((ds, i) => ({
          ...ds,
          borderColor: ds.color || `hsl(${i * 80}, 70%, 50%)`,
          backgroundColor: "rgba(0,0,0,0.05)",
          pointRadius: 3,
          tension: 0.35
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: "bottom" }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.05)" }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  // --- 3. Modal: Quick Log Sales ---
  (function(){
    const logModal = document.getElementById("logModal");
    const openLogBtn = document.getElementById("openLog");

    if (openLogBtn && logModal) {
      // Open modal
      openLogBtn.addEventListener("click", () => {
        const dateEl = document.getElementById("date");
        if (dateEl) dateEl.value = new Date().toISOString().slice(0,10);
        logModal.showModal();
      });

      // Handle modal close & save data to backend
      logModal.addEventListener("close", async () => {
        if (logModal.returnValue === "confirm") {
          const dish = document.getElementById("dish")?.value;
          const qty = parseInt(document.getElementById("qty")?.value || "0", 10);
          const date = document.getElementById("date")?.value;

          try {
            const res = await fetch("http://127.0.0.1:5000/api/sales", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ dish, qty, date })
            });

            if (res.ok) {
              alert(`Saved: ${qty} × ${dish} on ${date}`);
              // Refresh both chart and menu performance
              await Promise.all([
                renderChart(),
                updateMenuPerformance()
              ]);
            } else {
              alert("Failed to save sale!");
            }
          } catch (err) {
            console.error("Error saving sale:", err);
            alert("Failed to save sale!");
          }
        }
      });
    }
  })();

  // --- 4. Load and Display Menu Performance ---
  async function updateMenuPerformance() {
    try {
      const res = await fetch("http://127.0.0.1:5000/api/menu_performance");
      const data = await res.json();
      
      // Get list containers
      const topList = document.getElementById("top3-list");
      const bottomList = document.getElementById("bottom3-list");
      
      if (topList && bottomList) {
        // Clear existing content
        topList.innerHTML = "";
        bottomList.innerHTML = "";
        
        // Add top performers
        (data.top3 || []).forEach(item => {
          const div = document.createElement("div");
          div.innerHTML = `<span class="dot green"></span>${item}`;
          topList.appendChild(div);
        });
        
        // Add bottom performers
        (data.bottom3 || []).forEach(item => {
          const div = document.createElement("div");
          div.innerHTML = `<span class="dot red"></span>${item}`;
          bottomList.appendChild(div);
        });
      }
    } catch (err) {
      console.error("Error loading menu performance:", err);
    }
  }

  // --- 5. Load and Display Inventory Overview ---
  async function loadInventoryOverview() {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/inventory');
      if (!response.ok) throw new Error('Failed to fetch inventory data');
      const data = await response.json();

      const card = document.getElementById('inventory-card');
      if (!card) return;

      card.innerHTML = `
        <h3>Inventory Overview</h3>
        <ul class="inventory-stats">
          <li><strong>Total Items:</strong> ${data.total_items}</li>
          <li><strong>Low Stock:</strong> <span class="warning">${data.low_stock}</span></li>
          <li><strong>Out of Stock:</strong> <span class="danger">${data.out_of_stock}</span></li>
          <li><strong>Restock Soon:</strong> <span class="info">${data.restock_soon}</span></li>
        </ul>
      `;
    } catch (err) {
      console.error('Error loading inventory overview:', err);
      const card = document.getElementById('inventory-card');
      if (card) {
        card.innerHTML = '<p class="error">Failed to load inventory data</p>';
      }
    }
  }

  // --- 6. Load Suggestions ---
  async function loadSuggestions() {
    const container = document.getElementById("suggestionsContainer");

    try {
      const res = await fetch("http://127.0.0.1:5000/api/suggestions");
      const data = await res.json();

      if (data.length === 0) {
        container.innerHTML = "<p class='muted'>No suggestions available.</p>";
        return;
      }

      container.innerHTML = data.map(s => `
        <div style="padding:8px 0; border-bottom:1px solid #eee;">
          <strong>${s.item}</strong><br>
          Stock: ${s.stock} | Predicted Demand: ${s.predicted} <br>
          Suggested Discount: <strong>${(s.discount * 100).toFixed(1)}%</strong>
        </div>
      `).join("");

    } catch (err) {
      console.error(err);
      container.innerHTML = "<p class='muted'>Failed to load suggestions.</p>";
    }
  }

  // --- Initialize Everything on Load ---
  window.addEventListener("DOMContentLoaded", async () => {
    try {
      await Promise.all([
        renderChart(),
        updateMenuPerformance(),
        loadInventoryOverview(),  // Add inventory loading
        loadSuggestions()          // Add suggestions loading
      ]);
    } catch (err) {
      console.error("Error initializing dashboard:", err);
    }
  });