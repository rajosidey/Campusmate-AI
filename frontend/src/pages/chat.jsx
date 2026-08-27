import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

function Chat() {
  const navigate = useNavigate()

  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [conversationId, setConversationId] = useState(
    crypto.randomUUID()
  )

  const [conversations, setConversations] = useState([])

  const user = JSON.parse(
    localStorage.getItem('user') || '{}'
  )

  const token = localStorage.getItem('access_token')

  // --------------------------------------------------
  // Authentication
  // --------------------------------------------------

  useEffect(() => {
    if (!token) {
      navigate('/student-login')
    }
  }, [token, navigate])

  // --------------------------------------------------
  // Safely convert errors to readable text
  // --------------------------------------------------

  const getErrorMessage = (data) => {
    if (!data) {
      return 'Something went wrong.'
    }

    if (typeof data === 'string') {
      return data
    }

    if (Array.isArray(data)) {
      return data
        .map((item) => {
          if (typeof item === 'string') {
            return item
          }

          if (item?.msg) {
            return item.msg
          }

          return JSON.stringify(item)
        })
        .join(', ')
    }

    if (data.detail) {
      return getErrorMessage(data.detail)
    }

    if (data.message) {
      return getErrorMessage(data.message)
    }

    if (data.error) {
      return getErrorMessage(data.error)
    }

    try {
      return JSON.stringify(data)
    } catch {
      return 'Something went wrong.'
    }
  }

  // --------------------------------------------------
  // Load chat history from database
  // --------------------------------------------------

  const loadHistory = async () => {
    if (!token) {
      return
    }

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/ai/history',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      console.log(
        'CampusMate history response:',
        data
      )

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data)
        )
      }

      const history = Array.isArray(data.history)
        ? data.history
        : []

      // ----------------------------------------------
      // Group messages by conversation
      // ----------------------------------------------

      const grouped = {}

      history.forEach((item) => {
        if (!grouped[item.conversation_id]) {
          grouped[item.conversation_id] = []
        }

        grouped[item.conversation_id].push(item)
      })

      // ----------------------------------------------
      // Create conversation list
      // ----------------------------------------------

      const conversationList = Object.keys(
        grouped
      )
        .map((id) => {
          const chatMessages = grouped[id]

          const firstUserMessage =
            chatMessages.find(
              (item) => item.role === 'user'
            )

          return {
            id,
            title:
              firstUserMessage?.content ||
              'New conversation',

            messages: chatMessages,

            created_at:
              chatMessages[0]?.created_at ||
              null,
          }
        })
        .sort((a, b) => {
          return (
            new Date(b.created_at || 0) -
            new Date(a.created_at || 0)
          )
        })

      setConversations(conversationList)

    } catch (err) {
      console.error(
        'History loading error:',
        err
      )
    }
  }

  // --------------------------------------------------
  // Load history when page opens
  // --------------------------------------------------

  useEffect(() => {
    loadHistory()
  }, [token])

  // --------------------------------------------------
  // Load a specific conversation
  // --------------------------------------------------

  const loadConversation = async (
    selectedConversationId
  ) => {
    if (!token) {
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/ai/history/${selectedConversationId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      console.log(
        'Selected conversation:',
        data
      )

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data)
        )
      }

      const loadedMessages =
        Array.isArray(data.messages)
          ? data.messages
          : []

      setMessages(
        loadedMessages.map((item) => ({
          role: item.role,
          content: item.content,
        }))
      )

      setConversationId(
        selectedConversationId
      )

      setMessage('')

    } catch (err) {
      console.error(
        'Conversation loading error:',
        err
      )

      setError(
        err.message ||
        'Unable to load this conversation.'
      )
    } finally {
      setLoading(false)
    }
  }

  // --------------------------------------------------
  // Send message to CampusMate AI
  // --------------------------------------------------

  const handleSend = async (e) => {
    e.preventDefault()

    const trimmedMessage = message.trim()

    if (!trimmedMessage || loading) {
      return
    }

    setError('')
    setLoading(true)

    // ----------------------------------------------
    // Display student message immediately
    // ----------------------------------------------

    setMessages((previous) => [
      ...previous,
      {
        role: 'user',
        content: trimmedMessage,
      },
    ])

    setMessage('')

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/ai/chat',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            message: trimmedMessage,
            conversation_id: conversationId,
          }),
        }
      )

      const data = await response.json()

      console.log(
        'CampusMate backend response:',
        data
      )

      console.log(
        'CampusMate HTTP status:',
        response.status
      )

      // ----------------------------------------------
      // Backend error
      // ----------------------------------------------

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data)
        )
      }

      // ----------------------------------------------
      // AI response
      // ----------------------------------------------

      if (
        data.response === undefined ||
        data.response === null
      ) {
        throw new Error(
          'The backend did not return an AI response.'
        )
      }

      const aiText =
        typeof data.response === 'string'
          ? data.response
          : JSON.stringify(data.response)

      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: aiText,
        },
      ])

      // ----------------------------------------------
      // Refresh Recent Chats
      // ----------------------------------------------

      await loadHistory()

    } catch (err) {
      console.error(
        'CampusMate chat error:',
        err
      )

      setError(
        err.message ||
        'Could not connect to CampusMate AI.'
      )
    } finally {
      setLoading(false)
    }
  }

  // --------------------------------------------------
  // New Chat
  // --------------------------------------------------

  const handleNewChat = () => {
    setMessages([])
    setMessage('')
    setError('')

    setConversationId(
      crypto.randomUUID()
    )
  }

  // --------------------------------------------------
  // Campus domain prompts
  // --------------------------------------------------

  const handleDomainClick = (domain) => {
    const questions = {
      Academics:
        'Can you help me with academic questions, courses, exams, and assignments?',

      Official:
        'Tell me about official college information.',

      Library:
        'Tell me about library services and resources.',

      Canteen:
        'Tell me about the college canteen.',

      'Co-curricular':
        'Tell me about clubs, events, and co-curricular activities.',

      Navigation:
        'Help me find places around campus.',
    }

    setMessage(
      questions[domain] ||
      `Tell me about ${domain}.`
    )
  }

  // --------------------------------------------------
  // Logout
  // --------------------------------------------------

  const handleLogout = () => {
    const role = user.role

    localStorage.removeItem('access_token')
    localStorage.removeItem('user')

    if (
      role === 'admin' ||
      role === 'administrator'
    ) {
      navigate('/admin-login')
    } else {
      navigate('/student-login')
    }
  }

  // --------------------------------------------------
  // User initial
  // --------------------------------------------------

  const userInitial = user.name
    ? user.name.charAt(0).toUpperCase()
    : 'S'

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="chat-app">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="chat-sidebar">

        <div className="sidebar-brand">

          <h1>
            CampusMate
          </h1>

          <p>
            AI Assistant
          </p>

        </div>

        <button
          className="new-chat-button"
          onClick={handleNewChat}
        >

          <span className="new-chat-plus">
            +
          </span>

          New Chat

        </button>

        {/* Campus Domains */}

        <div className="sidebar-section">

          <h3>
            Campus Domains
          </h3>

          <button
            className="domain-item"
            onClick={() =>
              handleDomainClick('Academics')
            }
          >

            <strong>
              Academics
            </strong>

            <span>
              Courses, exams and assignments
            </span>

          </button>

          <button
            className="domain-item"
            onClick={() =>
              handleDomainClick('Official')
            }
          >

            <strong>
              Official
            </strong>

            <span>
              College information
            </span>

          </button>

          <button
            className="domain-item"
            onClick={() =>
              handleDomainClick('Library')
            }
          >

            <strong>
              Library
            </strong>

            <span>
              Books and library services
            </span>

          </button>

          <button
            className="domain-item"
            onClick={() =>
              handleDomainClick('Canteen')
            }
          >

            <strong>
              Canteen
            </strong>

            <span>
              Food and canteen information
            </span>

          </button>

          <button
            className="domain-item"
            onClick={() =>
              handleDomainClick('Co-curricular')
            }
          >

            <strong>
              Co-curricular
            </strong>

            <span>
              Clubs, events and activities
            </span>

          </button>

          <button
            className="domain-item"
            onClick={() =>
              handleDomainClick('Navigation')
            }
          >

            <strong>
              Navigation
            </strong>

            <span>
              Find places around campus
            </span>

          </button>

        </div>

        {/* Recent Chats */}

        <div className="sidebar-section recent-chats">

          <h3>
            Recent Chats
          </h3>

          {conversations.length === 0 ? (

            <p className="no-chats">
              No recent chats
            </p>

          ) : (

            <div className="conversation-list">

              {conversations.map(
                (conversation) => (

                  <button
                    key={conversation.id}
                    className={
                      conversation.id ===
                      conversationId
                        ? 'recent-chat-item active'
                        : 'recent-chat-item'
                    }
                    onClick={() =>
                      loadConversation(
                        conversation.id
                      )
                    }
                  >

                    {conversation.title.length >
                    32
                      ? `${conversation.title.slice(
                          0,
                          32
                        )}...`
                      : conversation.title}

                  </button>

                )
              )}

            </div>

          )}

        </div>

        {/* Bottom */}

        <div className="sidebar-bottom">

          <button
            className="sidebar-link"
          >
            Settings
          </button>

          <button
            className="sidebar-link"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </aside>

      {/* =================================================
          MAIN CHAT
      ================================================= */}

      <main className="chat-main">

        {/* Header */}

        <header className="chat-header">

          <div className="chat-header-title">

            <h2>
              CampusMate AI
            </h2>

            <p>
              Your Intelligent College Companion
            </p>

          </div>

          <div className="user-info">

            <div className="user-avatar">
              {userInitial}
            </div>

            <div className="user-details">

              <strong>
                {user.name || 'Student'}
              </strong>

              <span>
                {user.role || 'student'}
              </span>

            </div>

          </div>

        </header>

        {/* Messages */}

        <section className="messages-container">

          {messages.length === 0 ? (

            <div className="welcome-screen">

              <div className="ai-icon">
                AI
              </div>

              <h2>
                How can I help you today?
              </h2>

              <p>
                Ask CampusMate AI about your
                courses, assignments, campus
                services, college information,
                or anything else you need help with.
              </p>

              <div className="suggestion-grid">

                <button
                  onClick={() =>
                    setMessage(
                      'Can you help me with my courses?'
                    )
                  }
                >

                  <strong>
                    My courses
                  </strong>

                  <span>
                    Ask about your courses
                  </span>

                </button>

                <button
                  onClick={() =>
                    setMessage(
                      'What can you tell me about assignments?'
                    )
                  }
                >

                  <strong>
                    Assignments
                  </strong>

                  <span>
                    Get help with assignments
                  </span>

                </button>

                <button
                  onClick={() =>
                    setMessage(
                      'Tell me about the college library.'
                    )
                  }
                >

                  <strong>
                    Library
                  </strong>

                  <span>
                    Library information
                  </span>

                </button>

                <button
                  onClick={() =>
                    setMessage(
                      'Help me find places around campus.'
                    )
                  }
                >

                  <strong>
                    Campus navigation
                  </strong>

                  <span>
                    Find places around campus
                  </span>

                </button>

              </div>

            </div>

          ) : (

            <div className="messages-list">

              {messages.map(
                (msg, index) => (

                  <div
                    key={index}
                    className={
                      msg.role === 'user'
                        ? 'message-row user-message'
                        : 'message-row ai-message'
                    }
                  >

                    <div className="message-avatar">

                      {msg.role === 'user'
                        ? userInitial
                        : 'AI'}

                    </div>

                    <div className="message-body">

                      <div className="message-name">

                        {msg.role === 'user'
                          ? user.name || 'Student'
                          : 'CampusMate AI'}

                      </div>

                      <div className="message-content">

                        {typeof msg.content ===
                        'string'
                          ? msg.content
                          : JSON.stringify(
                              msg.content
                            )}

                      </div>

                    </div>

                  </div>

                )
              )}

              {/* Loading */}

              {loading && (

                <div className="message-row ai-message">

                  <div className="message-avatar">
                    AI
                  </div>

                  <div className="message-body">

                    <div className="message-name">
                      CampusMate AI
                    </div>

                    <div className="message-content">
                      CampusMate AI is thinking...
                    </div>

                  </div>

                </div>

              )}

            </div>

          )}

          {/* Error */}

          {error && (

            <div className="chat-error">
              {error}
            </div>

          )}

        </section>

        {/* Input */}

        <div className="chat-input-area">

          <form
            className="chat-input-form"
            onSubmit={handleSend}
          >

            <textarea
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              placeholder="Message CampusMate AI..."
              rows="1"
              disabled={loading}
              onKeyDown={(e) => {

                if (
                  e.key === 'Enter' &&
                  !e.shiftKey
                ) {

                  e.preventDefault()

                  handleSend(e)
                }

              }}
            />

            <button
              type="submit"
              className="send-button"
              disabled={
                !message.trim() ||
                loading
              }
            >
              {loading ? '...' : 'Send'}
            </button>

          </form>

          <p className="input-disclaimer">
            CampusMate AI can make mistakes.
            Check important information.
          </p>

        </div>

      </main>

    </div>
  )
}

export default Chat