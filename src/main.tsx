import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './hooks/useAuth' // Import the AuthProvider
import { Toaster } from "@/components/ui/toaster"


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider> {/* Wrap the App with the AuthProvider */}
      <App />
      <Toaster />
    </AuthProvider>
  </React.StrictMode>,
)
