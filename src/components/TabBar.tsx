import { Layers3, Sparkles } from 'lucide-react'
import { NavLink } from 'react-router-dom'

export default function TabBar() {
  return (
    <nav className="tab-bar" aria-label="Main navigation">
      <NavLink className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} to="/" end>
        <Layers3 size={19} />
        <span>Categories</span>
      </NavLink>
      <NavLink className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} to="/play">
        <Sparkles size={19} />
        <span>Play</span>
      </NavLink>
    </nav>
  )
}
