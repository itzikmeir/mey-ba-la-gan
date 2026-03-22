import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RTLProvider } from './components/layout/RTLProvider'
import LoginPage from './pages/LoginPage'
import ParentPage from './pages/ParentPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminPage from './pages/AdminPage'

// Handle GitHub Pages SPA redirect
const getInitialRoute = () => {
  const search = window.location.search
  if (search.startsWith('?/')) {
    const path = search.slice(2).replace(/~and~/g, '&').split('&')[0]
    window.history.replaceState(null, '', '/' + path)
    return '/' + path
  }
  return null
}
getInitialRoute()

export default function App() {
  return (
    <RTLProvider>
      <BrowserRouter basename="/mey-ba-la-gan">
        <Routes>
          <Route path="/"           element={<LoginPage />} />
          <Route path="/parent"     element={<ParentPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin"      element={<AdminPage />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </RTLProvider>
  )
}
