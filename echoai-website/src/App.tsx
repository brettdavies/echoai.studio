import { lazy, Suspense } from 'react'
import NavBar from './components/NavBar'
import HeroSection from './components/HeroSection'
import DocumentTitle from './components/DocumentTitle'
import LoggingControl from './components/debug/LoggingControl'
import { isDevelopmentMode } from './utils/environment'

// Lazy load non-critical sections
const FeaturesSection = lazy(() => import('./components/FeaturesSection'))
const MetricsSection = lazy(() => import('./components/MetricsSection')) 
const WorkflowCanvasSection = lazy(() => import('./components/WorkflowCanvasSection'))
const DeploymentSection = lazy(() => import('./components/DeploymentSection'))
const BestResultsSection = lazy(() => import('./components/BestResultsSection'))
const AutomateWorkSection = lazy(() => import('./components/AutomateWorkSection'))
const Footer = lazy(() => import('./components/Footer'))

function App() {
  return (
    <div className="min-h-screen bg-black">
      <DocumentTitle />
      <NavBar />
      <main>
        <HeroSection />
        <Suspense fallback={<div className="h-screen"></div>}>
          <FeaturesSection />
          <MetricsSection />
          <WorkflowCanvasSection />
          <DeploymentSection />
          <BestResultsSection />
          <AutomateWorkSection />
          <Footer />
        </Suspense>
      </main>
      {/* Only include LoggingControl in development mode */}
      {isDevelopmentMode() && <LoggingControl />}
    </div>
  )
}

export default App
