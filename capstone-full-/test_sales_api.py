import unittest
from unittest.mock import patch, MagicMock
import sys
import os
from datetime import datetime, date
from sales_api import app, get_sales_data

# Add the parent directory to sys.path to import sales_api
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


class TestGetSalesData(unittest.TestCase):
    
    def setUp(self):
        """Set up test client"""
        self.app = app
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
    
    @patch('sales_api.get_db_connection')
    def test_get_sales_data_success(self, mock_db_connection):
        """Test successful sales data retrieval"""
        # Mock database connection and cursor
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_db_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Mock categories data
        mock_categories = [
            {"id": 1, "category_name": "Electronics"},
            {"id": 2, "category_name": "Clothing"}
        ]
        
        # Mock items data for each category
        mock_items_electronics = [
            {"name": "Smartphone", "color": "#007bff"},
            {"name": "Laptop", "color": "#28a745"}
        ]
        mock_items_clothing = [
            {"name": "T-Shirt", "color": "#ffc107"}
        ]
        
        # Mock sales data
        mock_sales = [
            {"date": date(2024, 1, 1), "total": 1500.50},
            {"date": date(2024, 1, 2), "total": 2300.75}
        ]
        
        # Configure cursor fetchall returns
        mock_cursor.fetchall.side_effect = [
            mock_categories,  # First call for categories
            mock_items_electronics,  # Second call for electronics items
            mock_items_clothing,  # Third call for clothing items
            mock_sales  # Fourth call for sales data
        ]
        
        # Make request
        response = self.client.get('/api/sales')
        
        # Assertions
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        
        # Check response structure
        self.assertIn('chart', data)
        self.assertIn('categories', data)
        
        # Check chart data
        chart = data['chart']
        self.assertIn('labels', chart)
        self.assertIn('datasets', chart)
        self.assertEqual(len(chart['labels']), 2)
        self.assertEqual(chart['labels'], ['Mon', 'Tue'])
        
        # Check categories data
        categories = data['categories']
        self.assertEqual(len(categories), 2)
        self.assertEqual(categories[0]['name'], 'Electronics')
        self.assertEqual(len(categories[0]['items']), 2)
        
        # Verify database calls
        self.assertEqual(mock_cursor.execute.call_count, 4)
        mock_cursor.close.assert_called_once()
        mock_conn.close.assert_called_once()
    
    @patch('sales_api.get_db_connection')
    def test_get_sales_data_empty_results(self, mock_db_connection):
        """Test with empty database results"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_db_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Mock empty results
        mock_cursor.fetchall.side_effect = [[], [], [], []]
        
        response = self.client.get('/api/sales')
        
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        
        self.assertEqual(data['categories'], [])
        self.assertEqual(data['chart']['labels'], [])
        self.assertEqual(data['chart']['datasets'][0]['data'], [])
    
    @patch('sales_api.get_db_connection')
    def test_get_sales_data_database_error(self, mock_db_connection):
        """Test database connection error"""
        mock_db_connection.side_effect = Exception("Database connection failed")
        
        response = self.client.get('/api/sales')
        
        self.assertEqual(response.status_code, 500)
        data = response.get_json()
        self.assertIn('error', data)
        self.assertEqual(data['error'], "Database connection failed")
    
    @patch('sales_api.get_db_connection')
    def test_get_sales_data_cursor_error(self, mock_db_connection):
        """Test cursor execution error"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_db_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Mock cursor execution error
        mock_cursor.execute.side_effect = Exception("SQL execution failed")
        
        response = self.client.get('/api/sales')
        
        self.assertEqual(response.status_code, 500)
        data = response.get_json()
        self.assertIn('error', data)
    
    @patch('sales_api.get_db_connection')
    def test_get_sales_data_single_category_multiple_items(self, mock_db_connection):
        """Test with single category having multiple items"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_db_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        mock_categories = [{"id": 1, "category_name": "Books"}]
        mock_items = [
            {"name": "Fiction", "color": "#ff0000"},
            {"name": "Non-Fiction", "color": "#00ff00"},
            {"name": "Comics", "color": "#0000ff"}
        ]
        mock_sales = [{"date": date(2024, 1, 1), "total": 500.00}]
        
        mock_cursor.fetchall.side_effect = [mock_categories, mock_items, mock_sales]
        
        response = self.client.get('/api/sales')
        
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        
        self.assertEqual(len(data['categories']), 1)
        self.assertEqual(data['categories'][0]['name'], 'Books')
        self.assertEqual(len(data['categories'][0]['items']), 3)

if __name__ == '__main__':
    unittest.main()