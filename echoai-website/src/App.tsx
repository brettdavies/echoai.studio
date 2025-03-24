import NavBar from './components/NavBar'
import HeroSection from './components/HeroSection'
import FeaturesSection from './components/FeaturesSection'
import CodeExampleSection from './components/CodeExampleSection'
import MetricsSection from './components/MetricsSection'
import WorkflowCanvasSection from './components/WorkflowCanvasSection'
import DeploymentSection from './components/DeploymentSection'
import BestResultsSection from './components/BestResultsSection'
import AutomateWorkSection from './components/AutomateWorkSection'
import FormattingExampleSection from './components/FormattingExampleSection'
import Footer from './components/Footer'
import DocumentTitle from './components/DocumentTitle'
import LoggingControl from './components/debug/LoggingControl'

function App() {
  return (
    <div className="min-h-screen bg-black">
      <DocumentTitle />
      <NavBar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <CodeExampleSection />
        <MetricsSection />
        <WorkflowCanvasSection />
        <DeploymentSection />
        <BestResultsSection />
        <AutomateWorkSection />
        <FormattingExampleSection />
      </main>
      <Footer />
      {/* Only include LoggingControl in development mode */}
      {process.env.NODE_ENV !== 'production' && <LoggingControl />}
    </div>
  )
}

export default App
