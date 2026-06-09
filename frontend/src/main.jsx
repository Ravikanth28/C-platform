import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0f1628',
              color: '#e2e8f0',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '10px',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#0f1628' } },
            error:   { iconTheme: { primary: '#f43f5e', secondary: '#0f1628' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
