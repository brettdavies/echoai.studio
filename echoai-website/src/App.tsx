import NavBar from './components/NavBar'
import HeroSection from './components/HeroSection'
import FeaturesSection from './components/FeaturesSection'
import CodeExampleSection from './components/CodeExampleSection'
import MetricsSection from './components/MetricsSection'
import WorkflowCanvasSection from './components/WorkflowCanvasSection'
import MetricsToolsSection from './components/MetricsToolsSection'
import EnterpriseSecuritySection from './components/EnterpriseSecuritySection'
import DeploymentSection from './components/DeploymentSection'
import BestResultsSection from './components/BestResultsSection'
import AutomateWorkSection from './components/AutomateWorkSection'
import Footer from './components/Footer'

function App() {
  return (
    <div className="min-h-screen bg-black">
      <NavBar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <CodeExampleSection />
        <MetricsSection />
        <WorkflowCanvasSection />
        <MetricsToolsSection />
        <EnterpriseSecuritySection />
        <DeploymentSection />
        <BestResultsSection />
        <AutomateWorkSection />
      </main>
      <Footer />
    </div>
  )
}

export default App
