// Handle registration form submission
async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.querySelector('input[name="role"]:checked').value;
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
    successMessage.style.display = 'none';
    successMessage.textContent = '';

    if (!username || !password) {
        errorMessage.textContent = 'Please enter both username and password.';
        errorMessage.style.display = 'block';
        return false;
    }

    try {
        const response = await fetch(`${getApiUrl()}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });
        const data = await response.json();
        if (response.ok) {
            successMessage.textContent = data.message || 'Registration successful! You can now login.';
            successMessage.style.display = 'block';
            // Optionally redirect to login after a short delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            errorMessage.textContent = data.message || 'Registration failed.';
            errorMessage.style.display = 'block';
        }
    } catch (err) {
        errorMessage.textContent = 'Server error. Please try again later.';
        errorMessage.style.display = 'block';
    }
    return false;
}

// Expose to HTML
window.handleRegister = handleRegister; 