import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { VoicesPage } from './pages/VoicesPage'
import { VoiceDetailPage } from './pages/VoiceDetailPage'
import { GeneratePage } from './pages/GeneratePage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<VoicesPage />} />
        <Route path="/voices/:id" element={<VoiceDetailPage />} />
        <Route path="/generate" element={<GeneratePage />} />
      </Route>
    </Routes>
  )
}
