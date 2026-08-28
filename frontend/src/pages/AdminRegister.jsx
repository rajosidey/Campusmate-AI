import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../App.css'

function AdminRegister() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()

    setError('')
    setSuccess('')
    setLoading(true)

    try {
     const response = await fetch(
  'http://127.0.0.1:8000/auth/admin-register',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim(),
      password,
    }),
  }
)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || 'Administrator registration failed.'
        )
      }

      setSuccess(
        'Administrator account created successfully. Redirecting to login...'
      )

      setTimeout(() => {
        navigate('/admin-login')
      }, 1000)

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

        <h2>Create Administrator Account</h2>

        <p className="login-subtitle">
          Create your CampusMate AI administrator account
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        <form
          onSubmit={handleRegister}
          className="login-form"
        >

          <div className="form-group">

            <label htmlFor="adminName">
              Full Name
            </label>

            <input
              type="text"
              id="adminName"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />

          </div>

          <div className="form-group">

            <label htmlFor="adminEmail">
              Email
            </label>

            <input
              type="email"
              id="adminEmail"
              placeholder="Enter your email"
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
              placeholder="Create a password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              minLength={6}
              required
            />

          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading
              ? 'Creating account...'
              : 'Create Administrator Account'}
          </button>

        </form>

        <div className="signup-section">

          <span>
            Already have an administrator account?
          </span>

          <Link
            to="/admin-login"
            className="signup-link"
          >
            Administrator Login
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

export default AdminRegister