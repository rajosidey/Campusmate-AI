import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ForgotPassword from './pages/ForgotPassworrd.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import StudentLogin from './pages/StudentLogin'
import AdminLogin from './pages/AdminLogin'
import Register from './pages/register'
import AdminRegister from './pages/AdminRegister'
import Chat from './pages/chat'

import './App.css'


function Home() {
  return (
    <div className="app">

      <h1>CampusMate AI</h1>

      <p>
        Your Intelligent College Companion
      </p>

      <div className="login-options">

        <a href="/student-login">
          <button>
            Student Login
          </button>
        </a>

        <a href="/admin-login">
          <button>
            Administrator Login
          </button>
        </a>

      </div>

    </div>
  )
}


function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* Home */}

        <Route
          path="/"
          element={<Home />}
        />


        {/* Student Login */}

        <Route
          path="/student-login"
          element={<StudentLogin />}
        />


        {/* Student Registration */}

        <Route
          path="/register"
          element={<Register />}
        />


        {/* Administrator Login */}

        <Route
          path="/admin-login"
          element={<AdminLogin />}
        />
        {/* Administrator Register */}
        <Route
         path="/admin-register"
         element={<AdminRegister />}
        />

        {/* CampusMate AI */}

        <Route
          path="/chat"
          element={<Chat />}
        />
        <Route
  path="/forgot-password"
  element={<ForgotPassword />}
/>

<Route
  path="/reset-password"
  element={<ResetPassword />}
/>

      </Routes>

    </BrowserRouter>
  )
}

export default App