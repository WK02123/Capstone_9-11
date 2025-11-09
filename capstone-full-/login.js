function generateID() {
  let uname = document.getElementById("uname").value.toLowerCase() || "user";
  let randomNum = Math.floor(Math.random() * 100);
  let id = uname + randomNum;

  // Save to localStorage
  localStorage.setItem("userID", id);

  // Redirect back to login
  window.location.href = "loginpage.html";
}

function signIn() {
  // Persist user id from input or autoID before redirect
  try {
    const userEl = document.getElementById("loginUser");
    const autoIdEl = document.getElementById("autoID");
    const username = (userEl && userEl.value ? userEl.value : (autoIdEl ? autoIdEl.textContent : "")) || "user";
    localStorage.setItem("userID", username.trim());
  } catch (e) {}
  // Simulate login success and redirect
  alert("Signed in successfully!");
  window.location.href = "dashboard.html"; // <-- jump to dashboard
}

function switchAccount() {
  // Clear stored ID and switch back to normal login
  localStorage.removeItem("userID");
  document.getElementById("autoLogin").style.display = "none";
  document.getElementById("loginForm").style.display = "block";
}

window.onload = function() {
  let id = localStorage.getItem("userID");

  if (id) {
    // If signed up before → show auto login section
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("autoLogin").style.display = "block";
    document.getElementById("autoID").innerText = id;
  }
};

    // Validation for normal login form
    function validateLoginForm() {
      const loginUser = document.getElementById('loginUser').value.trim();
      const loginPwd = document.getElementById('loginPwd').value.trim();
      const loginBtn = document.getElementById('loginBtn');
      
      // Enable button only when both fields have content
      if (loginUser !== '' && loginPwd !== '') {
        loginBtn.disabled = false;
      } else {
        loginBtn.disabled = true;
      }
    }

    // Validation for auto login form
    function validateAutoLoginForm() {
      const autoPwd = document.getElementById('autoPwd').value.trim();
      const autoLoginBtn = document.getElementById('autoLoginBtn');
      
      // Enable button only when password field has content
      if (autoPwd !== '') {
        autoLoginBtn.disabled = false;
      } else {
        autoLoginBtn.disabled = true;
      }
    }

    // Add event listeners when page loads
    document.addEventListener('DOMContentLoaded', function() {
      // Add listeners for normal login form
      document.getElementById('loginUser').addEventListener('input', validateLoginForm);
      document.getElementById('loginPwd').addEventListener('input', validateLoginForm);
      
      // Add listener for auto login form
      document.getElementById('autoPwd').addEventListener('input', validateAutoLoginForm);
      
      // Initial validation
      validateLoginForm();
      validateAutoLoginForm();
    });
