import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import MonitorPage from './pages/MonitorPage'
import GDPRPage from './pages/GDPRPage'

export default function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <div className="nav-logo">
          <span className="nav-dot" />
          PSD2 Monitor
        </div>
        <NavLink to="/monitor" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Monitor</NavLink>
        <NavLink to="/gdpr"    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>GDPR Register</NavLink>
      </nav>
      <Routes>
        <Route path="/"        element={<Navigate to="/monitor" replace />} />
        <Route path="/monitor" element={<MonitorPage />} />
        <Route path="/gdpr"    element={<GDPRPage />} />
      </Routes>
    </BrowserRouter>
  )
}
