from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from contextlib import contextmanager
import sqlite3
import random
from datetime import datetime

app = Flask(__name__)
CORS(app)

def validate_sale(data):
    errors = []
    if not data.get("dish"):
        errors.append("Dish name is required")
    if not isinstance(data.get("qty"), int) or data["qty"] < 1:
        errors.append("Quantity must be a positive number")
    try:
        datetime.strptime(data.get("date", ""), "%Y-%m-%d")
    except ValueError:
        errors.append("Invalid date format (use YYYY-MM-DD)")
    return errors

@app.route("/api/sales", methods=["GET", "POST"])
def api_sales():
    if request.method == "POST":
        data = request.get_json() or {}
        errors = validate_sale(data)
        if errors:
            return jsonify({"errors": errors}), 400
        
@app.errorhandler(Exception)
def handle_error(e):
    code = 500
    if isinstance(e, HTTPException):
        code = e.code
    return jsonify({"error": str(e)}), code

# ==========================
# DATABASE CONNECTION
# ==========================
@contextmanager
def get_db_connection():
    conn = None
    try:
        conn = sqlite3.connect("gastrotrack.db")
        conn.row_factory = sqlite3.Row
        yield conn
    finally:
        if conn:
            conn.close()

# ==========================
# ROUTE: DASHBOARD PAGE
# ==========================
@app.route("/dashboard")
def dashboard():
    # Fetch chart data from DB (example logic)
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT item_name, MONTHNAME(sale_date) AS month, SUM(quantity) AS total_sold
        FROM sales
        GROUP BY item_name, MONTHNAME(sale_date)
        ORDER BY month;
    """)
    rows = cursor.fetchall()

    chart_data = {}
    for row in rows:
        item = row["item_name"]
        month = row["month"]
        qty = row["total_sold"]
        chart_data.setdefault(item, {})[month] = qty

    cursor.close()
    conn.close()

    return render_template("dashboard.html", chart_data=chart_data)


# ==========================
# ROUTE: GET + POST SALES DATA
# (used by Chart.js + Quick Log Sale modal)
# ==========================

@app.route("/api/sales", methods=["GET", "POST"])
def api_sales():
    """Handle sales data operations with proper error handling."""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            if request.method == "POST":
                data = request.get_json() or {}
                errors = validate_sale(data)
                if errors:
                    return jsonify({"errors": errors}), 400

                dish = data.get("dish")
                qty = int(data.get("qty", 0))
                date = data.get("date", datetime.now().strftime("%Y-%m-%d"))

                cursor.execute(
                    "INSERT INTO sales (item_name, quantity, sale_date) VALUES (?, ?, ?)",
                    (dish, qty, date)
                )
                conn.commit()
                return jsonify({"status": "success", "message": f"Added {qty}x {dish} on {date}"})

            # GET request - fetch sales data
            sales = cursor.execute("""
                SELECT item_name,
                       sale_date,
                       SUM(quantity) AS total_qty
                FROM sales
                GROUP BY item_name, sale_date
                ORDER BY sale_date ASC
            """).fetchall()

            if not sales:
                return jsonify({"labels": [], "datasets": []})

            labels = sorted(list(set(row["sale_date"] for row in sales)))
            items = sorted(list(set(row["item_name"] for row in sales)))

            datasets = [{
                "label": item,
                "data": [
                    next((r["total_qty"] for r in sales 
                          if r["item_name"] == item and r["sale_date"] == label), 0)
                    for label in labels
                ]
            } for item in items]

            return jsonify({"labels": labels, "datasets": datasets})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    # Reorganize data for Chart.js
    labels = sorted(list(set([row["sale_date"] for row in sales])))
    items = sorted(list(set([row["item_name"] for row in sales])))

    datasets = []
    for item in items:
        qty_data = []
        for label in labels:
            match = next((r["total_qty"] for r in sales if r["item_name"] == item and r["sale_date"] == label), 0)
            qty_data.append(match)
        datasets.append({
            "label": item,
            "data": qty_data
        })

    return jsonify({
        "labels": labels,
        "datasets": datasets
    })

# ==========================
# ROUTE: SALES SUMMARY
# ==========================
@app.route("/api/sales_summary")
def api_sales_summary():
    """Return only top 3 and bottom 3 items."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT item_name, SUM(quantity) AS total_qty
        FROM sales
        GROUP BY item_name
        ORDER BY total_qty DESC
    """)
    totals = cur.fetchall()
    conn.close()

    top3 = [dict(row) for row in totals[:3]]
    bottom3 = [dict(row) for row in totals[-3:]]
    return jsonify({"top3": top3, "bottom3": bottom3})


# ==========================
# ROUTE: DEMAND FORECAST (Random Simulation)
# ==========================
@app.route("/api/demand_forecast")
def demand_forecast():
    """Generates simple random demand predictions for menu items."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

    # Pull item names dynamically (4 random from sales or inventory)
    cursor.execute("SELECT DISTINCT item_name FROM sales ORDER BY RANDOM() LIMIT 4;")
    items = [row["item_name"] for row in cursor.fetchall()]

    if not items:
        cursor.execute("SELECT DISTINCT item_name FROM inventory ORDER BY RANDOM() LIMIT 4;")
        items = [row["item_name"] for row in cursor.fetchall()]

    conn.close()

    # Simulated demand forecast between -30% and +30%
    forecast = {item: random.randint(-30, 30) for item in items}
    return jsonify(forecast)


# ==========================
# ROUTE: PREDICTED DEMAND (Placeholder)
# ==========================
@app.route("/api/predicted_demand")
def predicted_demand():
    """
    Temporary static 7‑day percentage change predictions.
    Replace with real ML output later.
    """
    predictions = [
        {"item": "Latte", "change": 0.15},
        {"item": "PBJ", "change": -0.05},
        {"item": "Pancake", "change": -0.30}
    ]
    return jsonify(predictions)


# ==========================
# ROUTE: MENU PERFORMANCE
# ==========================
@app.route("/api/menu_performance")
def menu_performance():
    """Return top and bottom performing menu items with error handling."""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT item_name, SUM(quantity) as total_qty
                FROM sales
                GROUP BY item_name
                ORDER BY total_qty DESC
            """)
            items = cursor.fetchall()

            if not items:
                return jsonify({
                    "top3": ["No data"] * 3,
                    "bottom3": ["No data"] * 3
                })

            top3 = [dict(row)["item_name"] for row in items[:3]]
            bottom3 = [dict(row)["item_name"] for row in items[-3:]]

            return jsonify({
                "top3": top3,
                "bottom3": bottom3
            })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================
# ROUTE: INVENTORY STATUS
# ==========================
@app.route("/api/inventory")
def get_inventory():
    """Return inventory status with stock percentages."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        items = cursor.execute("SELECT item_name, stock_level, capacity FROM inventory").fetchall()

    inventory = []
    
    for i in items:
        percent = round((i["stock_level"] / i["capacity"]) * 100, 1) if i["capacity"] else 0
        inventory.append({
            "name": i["item_name"],
            "percent": percent
        })
    return jsonify(inventory)

# ==========================
# ROUTE: DEMAND FORECAST
# ==========================
@app.route("/api/demand_forecast")
def demand_forecast():
    return jsonify({
        "Chicken Breast": 12,
        "Tomatoes": -8,
        "Cheddar Cheese": 5
    })

# ==========================
# ROUTE: EXPIRY ALERTS
# ==========================
@app.route("/api/expiry_alerts")
def expiry_alerts():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT item_name,
               DATEDIFF(expiry_date, CURDATE()) AS days_left
        FROM inventory
        WHERE DATEDIFF(expiry_date, CURDATE()) <= 7
        ORDER BY days_left ASC;
    """)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)

# ==========================
# ROUTE: SUGGESTIONS
# ==========================
@app.route("/api/suggestions")
def suggestions():
    return jsonify({
        "items": [
            {"message": "Increase prep batch of Chicken Soup", "action": "High lunch demand"},
            {"message": "Reduce lettuce ordering", "action": "Lower sale volume"},
            {"message": "Promote pasta set", "action": "High conversion rate"}
        ]
    })



def init_db():
    """Initialize the database with required tables."""
    with get_db_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                sale_date DATE NOT NULL
            )
        """)
        conn.commit()

if __name__ == "__main__":
    init_db()  # Initialize database tables
    app.run(debug=True)