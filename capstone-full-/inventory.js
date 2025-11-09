// Inventory Page JavaScript - PRODUCTION READY

// ===== MODAL ELEMENTS =====
const restockModal = document.getElementById('restockModal');
const editModal = document.getElementById('editModal');
const addIngredientModal = document.getElementById('addIngredientModal');

// ===== MODAL CONTROL FUNCTIONS =====
function openRestockModal() {
  loadIngredientsDropdown('ingredientSelect');
  restockModal.showModal();
}

function closeRestockModal() {
  restockModal.close();
  document.getElementById('restockForm').reset();
}

function openEditModal() {
  loadIngredientsDropdown('editIngredient');
  editModal.showModal();
}

function closeEditModal() {
  editModal.close();
  document.getElementById('editForm').reset();
}

function openAddIngredientModal() {
  addIngredientModal.showModal();
}

function closeAddIngredientModal() {
  addIngredientModal.close();
  document.getElementById('addIngredientForm').reset();
}

// ===== LOAD INGREDIENTS DROPDOWN =====
async function loadIngredientsDropdown(selectId) {
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">Loading...</option>';
  
  try {
    const res = await fetch('http://127.0.0.1:5000/api/inventory');
    if (!res.ok) throw new Error('Failed to load ingredients');
    const data = await res.json();
    
    select.innerHTML = '<option value="">Select ingredient...</option>';
    data.forEach(item => {
      const option = document.createElement('option');
      option.value = item.item_id;
      option.textContent = item.item_name;
      option.dataset.stockLevel = item.stock_level;
      option.dataset.capacity = item.capacity;
      option.dataset.category = item.category || '';
      option.dataset.status = item.status || 'active';
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Failed to load ingredients:', err);
    select.innerHTML = '<option value="">Failed to load</option>';
  }
}

// ===== HANDLE INGREDIENT SELECTION =====
document.getElementById('editIngredient').addEventListener('change', function() {
  const selected = this.options[this.selectedIndex];
  if (selected.value) {
    document.getElementById('currentStock').value = selected.dataset.stockLevel || 0;
    document.getElementById('requiredStock').value = selected.dataset.capacity || 0;
    document.getElementById('category').value = selected.dataset.category || '';
    
    const status = selected.dataset.status || 'active';
    document.getElementById('disableBtn').style.display = status === 'active' ? 'block' : 'none';
    document.getElementById('enableBtn').style.display = status === 'disabled' ? 'block' : 'none';
  }
});

// ===== INGREDIENT MANAGEMENT FUNCTIONS =====
async function disableIngredient() {
  const select = document.getElementById('editIngredient');
  const ingredientId = select.value;
  const ingredientName = select.options[select.selectedIndex].text;
  
  if (!ingredientId) return alert('Please select an ingredient first');
  if (!confirm(`Disable "${ingredientName}"? It will be hidden from active inventory.`)) return;

  try {
    const res = await fetch(`http://127.0.0.1:5000/api/inventory/${ingredientId}/disable`, { 
      method: 'POST' 
    });
    if (!res.ok) throw new Error('Failed to disable');
    
    alert(`"${ingredientName}" has been disabled! ✅`);
    closeEditModal();
    setTimeout(loadInventory, 300);
  } catch (err) {
    console.error('Failed to disable ingredient:', err);
    alert('Failed to disable ingredient. Please try again.');
  }
}

async function enableIngredient() {
  const select = document.getElementById('editIngredient');
  const ingredientId = select.value;
  const ingredientName = select.options[select.selectedIndex].text;
  
  if (!ingredientId) return alert('Please select an ingredient first');

  try {
    const res = await fetch(`http://127.0.0.1:5000/api/inventory/${ingredientId}/enable`, { 
      method: 'POST' 
    });
    if (!res.ok) throw new Error('Failed to enable');
    
    alert(`"${ingredientName}" has been re-enabled! ✅`);
    closeEditModal();
    setTimeout(loadInventory, 300);
  } catch (err) {
    console.error('Failed to enable ingredient:', err);
    alert('Failed to enable ingredient. Please try again.');
  }
}

async function deleteIngredient() {
  const select = document.getElementById('editIngredient');
  const ingredientId = select.value;
  const ingredientName = select.options[select.selectedIndex].text;
  
  if (!ingredientId) return alert('Please select an ingredient first');
  if (!confirm(`Permanently DELETE "${ingredientName}"? This cannot be undone!`)) return;

  try {
    const res = await fetch(`http://127.0.0.1:5000/api/inventory/${ingredientId}`, { 
      method: 'DELETE' 
    });
    if (!res.ok) throw new Error('Failed to delete');
    
    alert(`"${ingredientName}" has been deleted! ✅`);
    closeEditModal();
    setTimeout(loadInventory, 300);
  } catch (err) {
    console.error('Failed to delete ingredient:', err);
    alert('Failed to delete ingredient. Please try again.');
  }
}

// ===== FORM SUBMISSIONS =====

// Restock Form
document.getElementById('restockForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const ingredientId = document.getElementById('ingredientSelect').value;
  const quantity = parseFloat(document.getElementById('quantity').value);
  const unit = document.getElementById('unit').value;

  try {
    const res = await fetch('http://127.0.0.1:5000/api/inventory/restock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: ingredientId, quantity, unit })
    });
    if (!res.ok) throw new Error('Failed to restock');
    
    alert('Restock logged successfully! ✅');
    closeRestockModal();
    setTimeout(loadInventory, 300);
  } catch (err) {
    console.error('Failed to log restock:', err);
    alert('Failed to log restock. Please try again.');
  }
});

// Edit Form
document.getElementById('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const ingredientId = document.getElementById('editIngredient').value;
  const stock_level = parseFloat(document.getElementById('currentStock').value);
  const capacity = parseFloat(document.getElementById('requiredStock').value);
  const category = document.getElementById('category').value;

  try {
    const res = await fetch(`http://127.0.0.1:5000/api/inventory/${ingredientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_level, capacity, category })
    });
    if (!res.ok) throw new Error('Failed to update');
    
    alert('Ingredient updated successfully! ✅');
    closeEditModal();
    setTimeout(loadInventory, 300);
  } catch (err) {
    console.error('Failed to update ingredient:', err);
    alert('Failed to update ingredient. Please try again.');
  }
});

// Add Ingredient Form
document.getElementById('addIngredientForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const item_name = document.getElementById('newIngredientName').value;
  const stock_level = parseFloat(document.getElementById('newCurrentStock').value);
  const capacity = parseFloat(document.getElementById('newRequiredStock').value);
  const category = document.getElementById('newCategory').value;

  try {
    const res = await fetch('http://127.0.0.1:5000/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_name, stock_level, capacity, category })
    });
    if (!res.ok) throw new Error('Failed to add ingredient');
    
    alert(`"${item_name}" added successfully! ✅`);
    closeAddIngredientModal();
    setTimeout(loadInventory, 300);
  } catch (err) {
    console.error('Failed to add ingredient:', err);
    alert('Failed to add ingredient. Please try again.');
  }
});

// ===== MODAL BACKDROP CLOSE =====
[restockModal, editModal, addIngredientModal].forEach(modal => {
  modal.addEventListener('click', (e) => { 
    if (e.target === modal) modal.close(); 
  });
});

// ===== ESC KEY TO CLOSE =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelector('dialog[open]')?.close();
});

// ===== PROGRESS BAR HELPER =====
function getProgressClass(percent) {
  if (percent === 0) return 'progress-empty';
  if (percent <= 20) return 'progress-bad';
  if (percent <= 60) return 'progress-warn';
  return 'progress-good';
}

// ===== FALLBACK DATA (for offline mode) =====
const fallbackData = {
  perishable: [
    { name: "Milk", percent: 70 },
    { name: "Lettuce", percent: 10 },
    { name: "Chicken", percent: 100 },
    { name: "Tomato", percent: 40 },
    { name: "Egg", percent: 90 },
    { name: "Fresh Fruits", percent: 50 }
  ],
  semiperishable: [
    { name: "Coffee Beans", percent: 60 },
    { name: "Bread", percent: 20 },
    { name: "Coconut Milk", percent: 80 },
    { name: "Cocoa Powder", percent: 45 },
    { name: "Matcha Powder", percent: 30 },
    { name: "Mayonnaise", percent: 50 },
    { name: "Jam", percent: 70 },
    { name: "Cream", percent: 60 }
  ]
};

// ===== RENDER INVENTORY =====
function renderGroups(perishableArr, semiArr) {
  const perishableList = document.getElementById('perishable-list');
  const semiList = document.getElementById('semiperishable-list');
  if (!perishableList || !semiList) return;

  const makeRows = arr => arr.map(item => `
    <div class="ingredient-row">
      <span class="ingredient-name">${item.name}</span>
      <div class="progress-bar">
        <div class="progress-fill ${getProgressClass(item.percent)}" style="width:${item.percent}%"></div>
      </div>
    </div>
  `).join('');

  perishableList.innerHTML = perishableArr.length ? makeRows(perishableArr) : "<div class='muted'>No perishable items.</div>";
  semiList.innerHTML = semiArr.length ? makeRows(semiArr) : "<div class='muted'>No semi-perishable items.</div>";

  // Animate progress bars
  requestAnimationFrame(() => {
    document.querySelectorAll('.progress-fill').forEach((fill, i) => {
      const target = fill.style.width;
      fill.style.width = '0%';
      setTimeout(() => { fill.style.width = target; }, 80 + i * 20);
    });
  });
}

// ===== LOAD INVENTORY =====
async function loadInventory() {
  const perishableList = document.getElementById('perishable-list');
  const semiList = document.getElementById('semiperishable-list');
  if (!perishableList || !semiList) return;

  perishableList.innerHTML = "<div class='ingredient-row loading'><span class='ingredient-name muted'>Loading...</span></div>";
  semiList.innerHTML = "<div class='ingredient-row loading'><span class='ingredient-name muted'>Loading...</span></div>";

  try {
    const res = await fetch('http://127.0.0.1:5000/api/inventory');
    if (!res.ok) throw new Error('Bad response');
    const rows = await res.json();

    // Fallback category mapping (if database category is missing)
    const perishableNames = new Set([
      'milk', 'lettuce', 'chicken', 'tomato', 'bread', 'egg', 
      'lemon', 'mushroom', 'fresh fruits', 'cream', 'jam'
    ]);

    const perishable = [];
    const semi = [];

    rows.forEach(r => {
      if (r.status === 'disabled') return; // Skip disabled
      
      const rawName = (r.item_name || '').trim();
      const key = rawName.toLowerCase();
      const pct = r.capacity ? Math.min(100, Math.round((r.stock_level / r.capacity) * 100)) : 0;
      
      // Smart categorization: use database category, fallback to name-based
      const target = r.category
        ? (r.category.toLowerCase().includes('semi') ? semi : perishable)
        : (perishableNames.has(key) ? perishable : semi);
        
      target.push({ name: rawName, percent: pct });
    });

    renderGroups(perishable, semi);
  } catch (err) {
    console.warn('Inventory API failed, using fallback data.', err);
    renderGroups(fallbackData.perishable, fallbackData.semiperishable);
  }
}

// ===== INITIALIZE =====
loadInventory();