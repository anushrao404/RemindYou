document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
  
    if (!username || !password) {
      alert("Please fill in both fields.");
      return;
    }
  
    const response = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
  
    const result = await response.json();
    if (response.ok) {
      //save token
      sessionStorage.setItem("authToken", result.token);
      sessionStorage.setItem('username',result.username)
      alert("Login successful");
      window.location.href = "reminders.html"; // Redirect to reminders page after successful username
    } else {
      alert(result.message);
    }
  });
  
  document.getElementById("forgotPasswordButton").addEventListener("click", () => {
    document.getElementById("forgotPasswordSection").style.display = "block";
  });
  
  document.getElementById("forgotPasswordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("resetEmail").value;
  
    // Email validation regex (simple example)
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailPattern.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }
  
    const response = await fetch("http://localhost:5000/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
  
    const result = await response.json();
    if (response.ok) {
      alert("OTP sent to your email");
      document.getElementById("forgotPasswordSection").style.display = "none";
      document.getElementById("resetPasswordSection").style.display = "block";
    } else {
      alert(result.message);
    }
  });
  
  document.getElementById("resetPasswordButton").addEventListener("click", async () => {
    const email = document.getElementById("resetEmail").value;
    const otp = document.getElementById("otp").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
  
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
  
    // Password strength check (for example: at least 8 characters)
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }
  
    const response = await fetch("http://localhost:5000/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp, newPassword }),
    });
  
    const result = await response.json();
    if (response.ok) {
      alert("Password reset successful");
      window.location.href = "index.html"; // Redirect back to username page
    } else {
      alert(result.message);
    }
  });
  