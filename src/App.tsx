import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Groups from './pages/Groups'
import EditCategory from './pages/EditGroup'
import PlayPick from './pages/PlayPick'
import ScratchBoard from './pages/ScratchBoard'
import { useCategories } from './store/useCategories'

function LegacyCategoryRedirect() {
  const { id = '' } = useParams()
  return <Navigate to={`/category/${id}`} replace />
}

export default function App() {
  const { appearance } = useCategories()

  return (
    <main className={`app-shell appearance-${appearance}`}>
      <Routes>
        <Route path="/" element={<Groups />} />
        <Route path="/category/:id" element={<EditCategory />} />
        <Route path="/group/:id" element={<LegacyCategoryRedirect />} />
        <Route path="/play" element={<PlayPick />} />
        <Route path="/play/:id" element={<ScratchBoard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  )
}
