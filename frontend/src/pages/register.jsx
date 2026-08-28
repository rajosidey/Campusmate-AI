import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../App.css'

function Register() {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`,
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
          data.detail || 'Registration failed.'
        )
      }

      setSuccess(
        'Account created successfully. Redirecting to login...'
      )

      setTimeout(() => {
        navigate('/student-login')
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
          <span>Student Portal</span>
        </div>

        <h2>Create Account</h2>

        <p className="login-subtitle">
          Create your CampusMate AI student account
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

            <label htmlFor="registerName">
              Full Name
            </label>

            <input
              type="text"
              id="registerName"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />

          </div>

          <div className="form-group">

            <label htmlFor="registerEmail">
              Email
            </label>

            <input
              type="email"
              id="registerEmail"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

          </div>

          <div className="form-group">

            <label htmlFor="registerPassword">
              Password
            </label>

            <input
              type="password"
              id="registerPassword"
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
              : 'Create Account'}
          </button>

        </form>

        <div className="signup-section">

          <span>
            Already have an account?
          </span>

          <Link
            to="/student-login"
            className="signup-link"
          >
            Student Login
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

export default Register