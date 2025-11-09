from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import mysql.connector
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# --- MySQL Connection ---
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="gastrotrack"
    )

# --- Fetch All Inventory (Active & Disabled) ---
@app.route("/api/inventory", methods=["GET"])
def get_inventory():
    """Return all inventory data as JSON with stock levels and status"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            item_id, 
            item_name, 
            stock_level,
            capacity,
            COALESCE(category, 'perishable') AS category,
            COALESCE(status, 'active') AS status,
            unit_cost,
            expiry_date,
            created_at,
            updated_at
        FROM inventory
        ORDER BY status ASC, item_name ASC
    """
    cursor.execute(query)
    items = cursor.fetchall()

    cursor.close()
    conn.close()

    # Compute stock percentage for frontend
    for item in items:
        capacity = float(item.get("capacity", 0))
        stock = float(item.get("stock_level", 0))
        item["stock_percent"] = round((stock / capacity) * 100, 2) if capacity > 0 else 0
        
        # Format dates if present
        if item.get("expiry_date"):
            item["expiry_date"] = item["expiry_date"].strftime("%Y-%m-%d")

    return jsonify(items)


# --- Add New Ingredient ---
@app.route("/api/inventory", methods=["POST"])
def add_ingredient():
    """Add a new ingredient to inventory"""
    data = request.json
    
    if not data.get("item_name"):
        return jsonify({"error": "item_name is required"}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO inventory 
        (item_name, stock_level, capacity, category, unit_cost, status)
        VALUES (%s, %s, %s, %s, %s, 'active')
    """
    
    try:
        cursor.execute(query, (
            data["item_name"],
            data.get("stock_level", 0),
            data.get("capacity", 0),
            data.get("category", "perishable"),
            data.get("unit_cost", 0)
        ))
        conn.commit()
        new_id = cursor.lastrowid
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "message": "Ingredient added successfully",
            "item_id": new_id
        }), 201
        
    except mysql.connector.Error as err:
        cursor.close()
        conn.close()
        return jsonify({"error": str(err)}), 500


# --- Update Ingredient ---
@app.route("/api/inventory/<int:item_id>", methods=["PUT"])
def update_ingredient(item_id):
    """Update an existing ingredient"""
    data = request.json
    
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        UPDATE inventory 
        SET stock_level = %s, 
            capacity = %s, 
            category = %s,
            updated_at = NOW()
        WHERE item_id = %s
    """
    
    try:
        cursor.execute(query, (
            data.get("stock_level"),
            data.get("capacity"),
            data.get("category"),
            item_id
        ))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({"message": "Ingredient updated successfully"})
        
    except mysql.connector.Error as err:
        cursor.close()
        conn.close()
        return jsonify({"error": str(err)}), 500


# --- Log Restock ---
@app.route("/api/inventory/restock", methods=["POST"])
def log_restock():
    """Log a restock event and update stock level"""
    data = request.json
    
    if not data.get("item_id") or not data.get("quantity"):
        return jsonify({"error": "item_id and quantity are required"}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()

    # Update stock level by adding the restocked quantity
    query = """
        UPDATE inventory 
        SET stock_level = stock_level + %s,
            updated_at = NOW()
        WHERE item_id = %s
    """
    
    try:
        cursor.execute(query, (data["quantity"], data["item_id"]))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({"message": "Restock logged successfully"})
        
    except mysql.connector.Error as err:
        cursor.close()
        conn.close()
        return jsonify({"error": str(err)}), 500


# --- Disable Ingredient ---
@app.route("/api/inventory/<int:item_id>/disable", methods=["POST"])
def disable_ingredient(item_id):
    """Disable an ingredient (soft delete)"""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        UPDATE inventory 
        SET status = 'disabled',
            updated_at = NOW()
        WHERE item_id = %s
    """
    
    try:
        cursor.execute(query, (item_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({"message": "Ingredient disabled successfully"})
        
    except mysql.connector.Error as err:
        cursor.close()
        conn.close()
        return jsonify({"error": str(err)}), 500


# --- Re-enable Ingredient ---
@app.route("/api/inventory/<int:item_id>/enable", methods=["POST"])
def enable_ingredient(item_id):
    """Re-enable a disabled ingredient"""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        UPDATE inventory 
        SET status = 'active',
            updated_at = NOW()
        WHERE item_id = %s
    """
    
    try:
        cursor.execute(query, (item_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({"message": "Ingredient re-enabled successfully"})
        
    except mysql.connector.Error as err:
        cursor.close()
        conn.close()
        return jsonify({"error": str(err)}), 500


# --- Permanently Delete Ingredient ---
@app.route("/api/inventory/<int:item_id>", methods=["DELETE"])
def delete_ingredient(item_id):
    """Permanently delete an ingredient from database"""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "DELETE FROM inventory WHERE item_id = %s"
    
    try:
        cursor.execute(query, (item_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return jsonify({"error": "Ingredient not found"}), 404
        
        cursor.close()
        conn.close()
        
        return jsonify({"message": "Ingredient permanently deleted"})
        
    except mysql.connector.Error as err:
        cursor.close()
        conn.close()
        return jsonify({"error": str(err)}), 500


# --- Get Low Stock Items ---
@app.route("/api/inventory/low-stock", methods=["GET"])
def get_low_stock():
    """Get items with stock level below 30% capacity"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            item_id, 
            item_name, 
            stock_level,
            capacity,
            category,
            ROUND((stock_level / capacity) * 100, 2) AS stock_percent
        FROM inventory
        WHERE status = 'active'
          AND capacity > 0
          AND (stock_level / capacity) < 0.3
        ORDER BY stock_percent ASC
    """
    
    cursor.execute(query)
    items = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(items)


# --- Frontend Route (Optional) ---
@app.route("/inventory")
def inventory_page():
    """Render inventory management page"""
    return render_template("inventory.html")


# --- Health Check ---
@app.route("/api/health", methods=["GET"])
def health_check():
    """Check if API and database connection are working"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        return jsonify({"status": "healthy", "database": "connected"})
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)