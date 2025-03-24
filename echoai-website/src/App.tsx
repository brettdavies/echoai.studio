import NavBar from './components/NavBar'
import HeroSection from './components/HeroSection'
import FeaturesSection from './components/FeaturesSection'
import MetricsSection from './components/MetricsSection'
import WorkflowCanvasSection from './components/WorkflowCanvasSection'
import DeploymentSection from './components/DeploymentSection'
import BestResultsSection from './components/BestResultsSection'
import AutomateWorkSection from './components/AutomateWorkSection'
import Footer from './components/Footer'
import DocumentTitle from './components/DocumentTitle'
import LoggingControl from './components/debug/LoggingControl'
import WebSocketDebugger from './components/debug/WebSocketDebugger'
import { isDevelopmentMode } from './utils/environment'

function App() {
  return (
    <div className="min-h-screen bg-black">
      <DocumentTitle />
      <NavBar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <MetricsSection />
        <WorkflowCanvasSection />
        <DeploymentSection />
        <BestResultsSection />
        <AutomateWorkSection />
      </main>
      <Footer />
      {/* Only include LoggingControl in development mode */}
      {isDevelopmentMode() && <LoggingControl />}
      {/* Add WebSocket Debugger in Development Mode */}
      {isDevelopmentMode() && <WebSocketDebugger />}
    </div>
  )
}

export default App
