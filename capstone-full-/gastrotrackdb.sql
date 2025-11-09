CREATE DATABASE IF NOT EXISTS gastrotrack;
USE gastrotrack;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('Admin','Staff') DEFAULT 'Staff',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    quantity INT DEFAULT 0 CHECK (quantity >= 0),
    stock_level DECIMAL(10,2) DEFAULT 0.00 CHECK (stock_level >= 0),
    capacity DECIMAL(10,2) DEFAULT 0.00 CHECK (capacity >= 0),
    category ENUM('perishable','semi-perishable') DEFAULT 'perishable',
    unit_cost DECIMAL(10,2) DEFAULT 0.00 CHECK (unit_cost >= 0),
    expiry_date DATE,
    is_active TINYINT(1) DEFAULT 1,
    status ENUM('active','disabled') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE menu (
    menu_id INT AUTO_INCREMENT PRIMARY KEY,
    menu_name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) DEFAULT 0.00 CHECK (price >= 0),
    availability ENUM('Available','Unavailable') DEFAULT 'Available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE menu_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_id INT,
    item_id INT,
    quantity_used DECIMAL(10,2) CHECK (quantity_used > 0),
    FOREIGN KEY (menu_id) REFERENCES menu(menu_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory(item_id) ON DELETE CASCADE
);

CREATE TABLE sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    menu_id INT,
    quantity INT CHECK (quantity > 0),
    total_cost DECIMAL(10,2),
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_id) REFERENCES menu(menu_id)
);

CREATE TABLE waste (
    waste_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT,
    quantity INT CHECK (quantity > 0),
    reason VARCHAR(255),
    date_logged DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory(item_id)
);

CREATE TABLE demand_prediction (
    prediction_id INT AUTO_INCREMENT PRIMARY KEY,
    menu_id INT NULL,
    item_id INT NULL,
    predicted_date DATE NOT NULL,
    predicted_demand DECIMAL(10,2) NOT NULL CHECK (predicted_demand >= 0),
    model_used VARCHAR(100), -- optional (e.g., "Linear Regression", "Moving Average")
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_id) REFERENCES menu(menu_id),
    FOREIGN KEY (item_id) REFERENCES inventory(item_id)
);

-- ===== MIGRATION SCRIPT FOR EXISTING DATABASE =====
-- Run these if you already have the database created:

-- Add new columns to inventory table
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS stock_level DECIMAL(10,2) DEFAULT 0.00 CHECK (stock_level >= 0);

ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS capacity DECIMAL(10,2) DEFAULT 0.00 CHECK (capacity >= 0);

ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS category ENUM('perishable','semi-perishable') DEFAULT 'perishable';

ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1;

ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS status ENUM('active','disabled') DEFAULT 'active';

-- ===== SAMPLE DATA FOR TESTING =====
INSERT INTO inventory (item_name, stock_level, capacity, category, status) VALUES
('Milk', 7.0, 10.0, 'perishable', 'active'),
('Coffee Beans', 1.5, 10.0, 'semi-perishable', 'active'),
('Lettuce', 1.0, 10.0, 'perishable', 'active'),
('Chicken', 10.0, 10.0, 'perishable', 'active'),
('Tomato', 4.0, 10.0, 'perishable', 'active'),
('Bread', 2.0, 10.0, 'semi-perishable', 'active'),
('Egg', 9.0, 10.0, 'perishable', 'active'),
('Lemon', 0.0, 10.0, 'perishable', 'active'),
('Mushroom', 0.0, 10.0, 'perishable', 'active'),
('Fresh Fruits', 0.0, 10.0, 'perishable', 'active'),
('Coconut Milk', 8.0, 10.0, 'semi-perishable', 'active'),
('Cocoa Powder', 4.5, 10.0, 'semi-perishable', 'active'),
('Matcha Powder', 3.0, 10.0, 'semi-perishable', 'active'),
('Mayonnaise', 5.0, 10.0, 'semi-perishable', 'active'),
('Jam', 7.0, 10.0, 'semi-perishable', 'active'),
('Cream', 6.0, 10.0, 'perishable', 'active');