/* js/auth.js */

const API_Base = '/api/auth';

/**
 * Handles Signup Form Submission
 */
async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = e.target.querySelector('button');

    try {
        btn.textContent = 'Creating Account...';
        btn.disabled = true;

        const res = await fetch(`${API_Base}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (res.ok) {
            // Save token and redirect
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'index.html';
        } else {
            alert(data.message || 'Signup failed');
            btn.textContent = 'Create Account';
            btn.disabled = false;
        }
    } catch (err) {
        console.error(err);
        alert('Something went wrong. Is the server running?');
        btn.textContent = 'Create Account';
        btn.disabled = false;
    }
}

/**
 * Handles Signin Form Submission
 */
async function handleSignin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = e.target.querySelector('button');

    try {
        btn.textContent = 'Signing In...';
        btn.disabled = true;

        const res = await fetch(`${API_Base}/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            // Save token and redirect
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'index.html';
        } else {
            alert(data.message || 'Login failed');
            btn.textContent = 'Sign In';
            btn.disabled = false;
        }
    } catch (err) {
        console.error(err);
        alert('Something went wrong. Is the server running?');
        btn.textContent = 'Sign In';
        btn.disabled = false;
    }
}

/**
 * Checks if user is authenticated (for index.html)
 */
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'signup.html';
    }
}

/**
 * Logout function
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'signin.html';
}
