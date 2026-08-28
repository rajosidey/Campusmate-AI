import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../App.css'

function ForgotPassword() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    setMessage('')
    setError('')
    setLoading(true)

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/auth/forgot-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail ||
          'Unable to process password reset request.'
        )
      }

      setMessage(
        data.message ||
        'If this email exists, a password reset link has been generated.'
      )

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

        <h1>Forgot Password</h1>

        <p>
          Enter your email address and we will
          help you reset your password.
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <label htmlFor="resetEmail">
            Email
          </label>

          <input
            type="email"
            id="resetEmail"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Sending...'
              : 'Send Reset Link'}
          </button>

        </form>

        <p className="signup-text">

          Remember your password?{' '}

          <Link to="/student-login">
            Back to Login
          </Link>

        </p>

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

export default ForgotPassword