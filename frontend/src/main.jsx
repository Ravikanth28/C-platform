import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--s)',
                color: 'var(--t)',
                border: '1px solid var(--b)',
                borderRadius: '10px',
                fontSize: '13px',
                fontFamily: 'var(--sans)',
                boxShadow: 'var(--shadow-md)',
              },
              success: { iconTheme: { primary: 'var(--ok)', secondary: 'var(--s)' } },
              error:   { iconTheme: { primary: 'var(--err)', secondary: 'var(--s)' } },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
