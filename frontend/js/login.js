// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.querySelector('input[name="role"]:checked').value;
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';

    if (!username || !password) {
        errorMessage.textContent = 'Please enter both username and password.';
        errorMessage.style.display = 'block';
        return false;
    }

    try {
        console.log('Sending login request:', { username, password });
        const response = await fetch(`${getApiUrl()}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        const data = await response.json();
        console.log('Response data:', data);
        if (response.ok) {
            // Handle the response format: { success: true, data: { user: {...}, token: "..." } }
            const user = data.data.user;
            const token = data.data.token;
            
            // Add the token to the user object
            user.token = token;
            localStorage.setItem('user', JSON.stringify(user));
            // Store token with consistent key name
            localStorage.setItem('authToken', token);
            console.log('Login successful, token stored:', token ? 'Yes' : 'No');
            // Redirect based on role
            if (user.role === 'admin') {
                window.location.href = 'html/dashboard.html';
            } else if (user.role === 'cashier') {
                window.location.href = 'html/pos.html';
            } else {
                window.location.href = 'html/dashboard.html';
            }
        } else {
            errorMessage.textContent = data.message || 'Login failed.';
            errorMessage.style.display = 'block';
        }
    } catch (err) {
        console.error('Login error:', err);
        errorMessage.textContent = `Server error: ${err.message}. Please check if the backend is running.`;
        errorMessage.style.display = 'block';
    }
    return false;
}

// Expose to HTML
window.handleLogin = handleLogin; 