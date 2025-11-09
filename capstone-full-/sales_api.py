from flask import Flask, jsonify, render_template
from flask_cors import CORS
import mysql.connector
import random
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

def get_db_connection():
    """Get database connection"""
    try:
        return mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASS"),
            database=os.getenv("DB_NAME")
        )
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        raise

def generate_sales_data():
    """Generate dynamic sales data for the chart and categories"""
    
    # Generate chart data for the last 12 months
    months = []
    current_date = datetime.now()
    for i in range(12):
        month_date = current_date - timedelta(days=30 * i)
        months.append(month_date.strftime('%b %Y'))
    months.reverse()
    
    # Generate random sales data
    sales_values = [random.randint(15000, 45000) for _ in range(12)]
    profit_values = [random.randint(5000, 15000) for _ in range(12)]
    orders_values = [random.randint(200, 800) for _ in range(12)]
    
    chart_data = {
        'labels': months,
        'datasets': [
            {
                'label': 'Sales',
                'data': sales_values,
                'borderColor': '#007bff',
                'backgroundColor': 'rgba(0, 123, 255, 0.1)',
                'tension': 0.4,
                'fill': True
            },
            {
                'label': 'Profit',
                'data': profit_values,
                'borderColor': '#28a745',
                'backgroundColor': 'rgba(40, 167, 69, 0.1)',
                'tension': 0.4,
                'fill': True
            },
            {
                'label': 'Orders',
                'data': orders_values,
                'borderColor': '#ffc107',
                'backgroundColor': 'rgba(255, 193, 7, 0.1)',
                'tension': 0.4,
                'fill': True
            }
        ]
    }
    
    # Generate dynamic categories data
    categories_data = [
        {
            'name': 'Electronics',
            'items': [
                {'name': 'Smartphones', 'color': '#007bff'},
                {'name': 'Laptops', 'color': '#28a745'},
                {'name': 'Tablets', 'color': '#ffc107'},
                {'name': 'Headphones', 'color': '#dc3545'}
            ]
        },
        {
            'name': 'Clothing',
            'items': [
                {'name': 'T-Shirts', 'color': '#6f42c1'},
                {'name': 'Jeans', 'color': '#20c997'},
                {'name': 'Sneakers', 'color': '#fd7e14'},
                {'name': 'Accessories', 'color': '#e83e8c'}
            ]
        },
        {
            'name': 'Home & Garden',
            'items': [
                {'name': 'Furniture', 'color': '#6c757d'},
                {'name': 'Decor', 'color': '#495057'},
                {'name': 'Kitchen', 'color': '#343a40'},
                {'name': 'Garden Tools', 'color': '#17a2b8'}
            ]
        },
        {
            'name': 'Books & Media',
            'items': [
                {'name': 'Fiction Books', 'color': '#007bff'},
                {'name': 'Non-Fiction', 'color': '#28a745'},
                {'name': 'DVDs', 'color': '#ffc107'},
                {'name': 'Magazines', 'color': '#dc3545'}
            ]
        }
    ]
    
    return {
        'chart': chart_data,
        'categories': categories_data,
        'summary': {
            'total_sales': sum(sales_values),
            'total_profit': sum(profit_values),
            'total_orders': sum(orders_values),
            'growth_rate': round(random.uniform(5.2, 15.8), 1)
        }
    }

@app.route("/api/sales")
def get_sales_data():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1) Fetch categories
        cursor.execute("SELECT id, category_name FROM menu_categories")
        categories_raw = cursor.fetchall()

        # 2) Fetch items per category
        categories = []
        for category in categories_raw:
            cursor.execute("""
                SELECT item_name AS name, color_code AS color
                FROM menu_items
                WHERE category_id = %s
            """, (category["id"],))
            items = cursor.fetchall()

            categories.append({
                "name": category["category_name"],
                "items": items
            })

        # 3) Fetch real sales data from the last 7 days
        cursor.execute("""
            SELECT DATE(sale_date) AS date, SUM(price * quantity) AS total
            FROM sales
            WHERE sale_date >= CURDATE() - INTERVAL 7 DAY
            GROUP BY DATE(sale_date)
        """)
        rows = cursor.fetchall()

        chart_data = {
            "labels": [r["date"].strftime("%a") for r in rows],
            "datasets": [{
                "label": "Total Sales",
                "data": [float(r["total"]) for r in rows],
                "borderColor": "#007bff",
                "backgroundColor": "rgba(0, 123, 255, 0.1)",
                "tension": 0.4,
                "fill": True
            }]
        }

        cursor.close()
        conn.close()

        return jsonify({"chart": chart_data, "categories": categories})
    
    except Exception as e:
        print(f"Error in get_sales_data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/sales/overview")
def get_sales_overview():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Get sales for each item for the last 7 days (Mon-Sun)
        cursor.execute("""
            SELECT 
                mi.item_name,
                mc.category_name,
                DAYNAME(s.sale_date) AS day_name,
                SUM(s.quantity) AS total_sold
            FROM sales s
            JOIN menu_items mi ON s.item_id = mi.id
            JOIN menu_categories mc ON mi.category_id = mc.id
            WHERE s.sale_date >= CURDATE() - INTERVAL 7 DAY
            GROUP BY mi.item_name, mc.category_name, DAYNAME(s.sale_date)
            ORDER BY mi.item_name;
        """)
        results = cursor.fetchall()

        # Reformat into frontend-friendly structure
        data = {}
        for row in results:
            item = row["item_name"]
            if item not in data:
                data[item] = {
                    "category": row["category_name"],
                    "sales": {d: 0 for d in ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]}
                }
            data[item]["sales"][row["day_name"]] = row["total_sold"]

        cursor.close()
        conn.close()
        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sales/realtime')
def get_realtime_sales():
    """API endpoint for real-time sales updates"""
    try:
        # Generate current day sales data
        current_sales = {
            'current_hour_sales': random.randint(500, 2000),
            'today_total': random.randint(8000, 15000),
            'active_orders': random.randint(50, 150),
            'conversion_rate': round(random.uniform(2.1, 4.8), 2),
            'timestamp': datetime.now().isoformat()
        }
        return jsonify(current_sales)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sales/categories/<category_name>')
def get_category_details(category_name):
    """API endpoint to get detailed data for a specific category"""
    try:
        # Generate detailed category data
        category_details = {
            'name': category_name.title(),
            'total_sales': random.randint(5000, 20000),
            'items_sold': random.randint(100, 500),
            'top_products': [
                {'name': f'Product {i}', 'sales': random.randint(100, 1000)} 
                for i in range(1, 6)
            ],
            'monthly_trend': [random.randint(500, 2000) for _ in range(12)]
        }
        return jsonify(category_details)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/')
def serve_sales_report():
    """Serve the sales report HTML file"""
    try:
        with open('Templates/sales-report.html', 'r', encoding='utf-8') as file:
            html_content = file.read()
        return html_content
    except FileNotFoundError:
        return "Sales report template not found", 404

# Additional utility endpoints
@app.route('/api/sales/export')
def export_sales_data():
    """Export sales data as JSON for download"""
    sales_data = generate_sales_data()
    sales_data['exported_at'] = datetime.now().isoformat()
    return jsonify(sales_data)

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

if __name__ == '__main__':
    print("Starting Sales API Server...")
    print("Sales Report available at: http://localhost:5000/")
    print("API Endpoint: http://localhost:5000/api/sales")
    print("Real-time Data: http://localhost:5000/api/sales/realtime")
    print("Press Ctrl+C to stop the server")
    
    app.run(debug=True, host='0.0.0.0', port=5000)