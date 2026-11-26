import { Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CategoryCard from '../components/GroupCard'
import TabBar from '../components/TabBar'
import { useCategories } from '../store/useCategories'

export default function PlayPick() {
  const { categories } = useCategories()
  const navigate = useNavigate()

  return (
    <div className="screen with-tabs">
      <header className="page-header">
        <div><h1>Play</h1><p className="subtitle">Pick a deck. Scratch to reveal.</p></div>
      </header>
      <section className="stack" aria-label="Categories to play">
        {categories.map((category) => <CategoryCard key={category.id} category={category} mode="play" onPlay={() => navigate(`/play/${category.id}`)} />)}
        {!categories.length && <div className="empty-state"><div className="empty-icon"><Sparkles size={28} /></div><h2>Nothing to play yet</h2><p>Create a category and add a few items first.</p><button className="button button-primary" onClick={() => navigate('/')}>Create a category</button></div>}
      </section>
      <TabBar />
    </div>
  )
}
