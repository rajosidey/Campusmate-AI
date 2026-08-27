import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../App.css'

function AdminLogin() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail ||
            'Login failed. Please check your credentials.'
        )
      }

      // Make sure this account is actually an administrator
      if (data.role !== 'admin') {
        throw new Error(
          'This account is not an administrator account.'
        )
      }

      // Save JWT
      if (data.access_token) {
        localStorage.setItem(
          'access_token',
          data.access_token
        )
      }

      // Save administrator information
      localStorage.setItem(
        'user',
        JSON.stringify({
          user_id: data.user_id,
          name: data.name,
          email: data.email,
          role: data.role,
          language: data.language,
        })
      )

      // Go to CampusMate AI
      navigate('/chat')

    } catch (err) {
      setError(
        err.message ||
          'Unable to connect to the server.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-brand">
          <h1>CampusMate AI</h1>
          <span>Administrator Portal</span>
        </div>

        <h2>Administrator Login</h2>

        <p className="login-subtitle">
          Welcome back to CampusMate AI
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          className="login-form"
        >

          <div className="form-group">

            <label htmlFor="adminEmail">
              Email
            </label>

            <input
              type="email"
              id="adminEmail"
              placeholder="Enter your administrator email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

          </div>

          <div className="form-group">

            <label htmlFor="adminPassword">
              Password
            </label>

            <input
              type="password"
              id="adminPassword"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

          </div>

          <div className="forgot-password-container">

            <Link to="/forgot-password">
              Forgot password?
            </Link>

          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading
              ? 'Logging in...'
              : 'Administrator Login'}
          </button>

        </form>

        <div className="signup-section">

          <span>
            Don't have an administrator account?
          </span>

          <Link
            to="/admin-register"
            className="signup-link"
          >
            Create an account
          </Link>

        </div>

        <Link
          to="/"
          className="back-link"
        >
          Back to Home
        </Link>

      </div>

    </div>
  )
}

export default AdminLogin