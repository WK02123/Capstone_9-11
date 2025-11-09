from flask import Flask, request, redirect, session
import urllib.parse
import mysql.connector

app = Flask(__name__)
app.secret_key = 'super_secret_key'  # used for Flask session encryption

# --- Configuration ---
DEMO_MODE = True  # Change to False to use MySQL
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',          # your MySQL password
    'database': 'gastrotrack'  # your database name
}


@app.route('/do_login', methods=['POST'])
def do_login():
    user = request.form.get('user', '').strip()
    password = request.form.get('pass', '')

    if user == '' or password == '':
        err_msg = urllib.parse.quote("Please enter username and password.")
        return redirect(f"/loginpage?err={err_msg}")

    if DEMO_MODE:
        # --- Demo user without DB ---
        if user == 'admin' and password == '1234':
            session['uid'] = 'adminsaOjack32'
            session['uname'] = 'Saojack'
            return redirect('/dashboard')
        else:
            err_msg = urllib.parse.quote("Incorrect password or username\nplease try again.")
            return redirect(f"/loginpage?err={err_msg}")

    # --- MySQL version ---
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, username, password_hash, display_name FROM users WHERE username=%s OR email=%s LIMIT 1",
            (user, user)
        )
        row = cursor.fetchone()

        if row:
            # You can use bcrypt or werkzeug.security.check_password_hash for real hashing
            import bcrypt
            if bcrypt.checkpw(password.encode('utf-8'), row['password_hash'].encode('utf-8')):
                session['uid'] = str(row['id'])
                session['uname'] = row['display_name'] or row['username']
                return redirect('/dashboard')

        err_msg = urllib.parse.quote("Incorrect password or username\nplease try again.")
        return redirect(f"/loginpage?err={err_msg}")

    except Exception as e:
        print("DB Error:", e)
        err_msg = urllib.parse.quote("Database connection error.")
        return redirect(f"/loginpage?err={err_msg}")

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()


@app.route('/loginpage')
def login_page():
    # Load your HTML frontend
    return open('loginpage.html', encoding='utf-8').read()


@app.route('/dashboard')
def dashboard():
    if 'uid' not in session:
        return redirect('/loginpage')
    uname = session.get('uname', 'User')
    return f"<h1>Welcome, {uname}!</h1><p>You are logged in as {session['uid']}.</p>"


if __name__ == '__main__':
    app.run(debug=True)