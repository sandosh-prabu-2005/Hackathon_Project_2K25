import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Earthquake from './components/Earthquake'
import Landslide from './components/Landslide'
import Flood from './components/Flood'
import { CycloneDashboard } from './components/CycloneDashboard';
import DisasterRoadmapScreen from './components/VirtualDrillPrompt';
import VduGame from './components/Vdu1Player';
import VduGame2 from './components/Vdu2Player';
import Home from './pages/Home'
import './styles/app.css'

function App() {
  return (
    <Router>
      <Routes>

        <Route path="/" element={<Home />} />
        <Route path="/earthquake" element={<Earthquake />} />
        <Route path="/landslide" element={<Landslide />} />
        <Route path="/flood" element={<Flood />} />
        <Route path="/cyclone" element={<CycloneDashboard />} />
        <Route path="/disaster-vd" element={<DisasterRoadmapScreen />} />
        <Route path="/drill" element={<VduGame />} />
        <Route path="/game" element={<VduGame2 />} />
      </Routes>
    </Router>
  )
}

export default App
