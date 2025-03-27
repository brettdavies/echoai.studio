---
theme: default
title: echoAI - Real-time Live Audio Transcription
fonts:
#   sans: 'Inter'
  weights: '300,400,500,600,700'
css: unocss
colorSchema: light
layout: cover
background: white
class: text-black
themeConfig:
  primary: '#8a2be2'
# US Letter proportions (8.5:11)
aspectRatio: '0.773'
# Width in pixels (standard US Letter at 96 DPI would be 816px)
canvasWidth: 816
# npx slidev export --with-clicks --format pdf --output slides-letter.pdf
---

<style>
:root {
  --background: 0 0% 0%;
  --foreground: 0 0% 100%;
  --primary: 190 100% 50%;  /* Bright electric blue */
  --primary-foreground: 265 100% 65%; /* Vibrant purple */
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 0 0% 15%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 12 6.5% 15.1%;
  --accent-foreground: 0 0% 98%;
  --navy-blue: 216 45% 20%;
  --teal-gradient-from: 190 100% 50%;
  --teal-gradient-to: 265 100% 65%;
}

h1 {
  @apply font-bold text-[hsl(var(--primary))];
}

h2, h3 {
  @apply font-semibold text-[hsl(var(--primary-foreground))];
}

strong {
  @apply font-bold text-black;
}

.rounded-circle {
  @apply rounded-full border-4 border-gray-200 object-cover;
}

.grid-layout {
  @apply grid grid-cols-2 gap-4;
}

.advisor-circle {
  @apply rounded-full w-24 h-24 flex items-center justify-center;
}

.advisor-grid {
  @apply grid grid-cols-[1fr_2fr] gap-y-5 mt-4;
}

/* One-pager specific styles */
.startup-onepager {
  @apply bg-white text-black p-0 m-0 relative overflow-hidden rounded-lg shadow-xl;
  font-family: Arial, sans-serif;
  width: 100%;
  height: 100vh;
  min-height: 100%;
  border: 1px solid #ddd;
}

/* Override default Slidev layout padding */
.slidev-layout {
  height: 100vh;
  min-height: 100%;
  padding-left: 0;
  padding-right: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin: 0;
}

.slidev-layout.cover, .slidev-layout.intro {
  display: block;
  height: 100vh;
  min-height: 100%;
}

.startup-header {
  background: linear-gradient(to right, hsl(var(--teal-gradient-from)), hsl(var(--teal-gradient-to)));
  @apply text-white py-3 px-6 text-center relative;
}

.startup-name {
  @apply text-3xl font-bold mb-1 tracking-wide text-[hsl(var(--primary-foreground))];
  letter-spacing: 2px;
}

.startup-contact-info {
  @apply flex justify-center items-center text-xs gap-4 mt-1 text-white/90;
}

.startup-circle {
  @apply w-14 h-14 rounded-full bg-white flex items-center justify-center absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-1/2 shadow-md;
}

.startup-x {
  @apply text-[hsl(var(--teal-gradient-to))] font-bold text-2xl;
}

.startup-pitch {
  background-color: hsl(var(--navy-blue));
  @apply text-white text-xs leading-tight py-3 px-6;
}

.startup-sections {
  @apply grid gap-0;
  grid-template-columns: 40% 60%;
}

.startup-left-col {
  @apply p-4;
}

.startup-right-col {
  @apply pt-4 px-4 pb-4;
}

.section-header {
  @apply font-bold text-sm uppercase tracking-wide mb-1;
  color: #000;
}

.info-item {
  @apply text-xs mb-2;
}

.team-member {
  @apply mb-4 flex items-start gap-3;
}

.team-image {
  @apply rounded-full w-12 h-12 object-cover;
}

.team-info {
  @apply flex-1;
}

.right-section {
  @apply mb-4;
}

.info-section {
  @apply bg-gray-100 -mx-4 -mt-0 px-4 py-4 mb-6;
}
</style>

<div class="startup-onepager">
  <div class="startup-header">
    <div class="startup-name">echoAI</div>
    <div class="startup-contact-info">
      <span>👤 Brett Davies</span>
      <span>✉️ brett@echoai.studio</span>
      <span>📞 +1 (442) 226-6244</span>
      <span>🌐 echoai.studio</span>
    </div>
  </div>
  <div class="startup-pitch">
    <!-- An overview of your company goes here. Founded in 2015, Company is a service/product that provides a unique thing to a certain audience. Our product reduces pain points and enhances the lives of our users. This is your elevator pitch. -->
    echoAI is building the real-time AI layer that powers the next generation of live media. Our ultra-fast audio transcription system delivers captions with just 750ms latency - 20x faster than industry standard - while maintaining superior accuracy for domain-specific terminology.
  </div>
  <div class="startup-sections">
    <div class="startup-left-col">
      <div class="info-section">
        <div class="info-item">
          <strong>Stage:</strong> Pre-Seed
        </div>
        <div class="info-item">
          <strong>Industry:</strong> AI-Powered Live Media Technology
        </div>
        <div class="info-item">
          <strong>Number of employees:</strong> 2 (add 2 addl max)
        </div>
        <div class="info-item">
          <!-- <strong>Market size:</strong> $30 B -->
          <strong>Market size:</strong> $80B TAM, $30B SAM
        </div>
        <div class="info-item">
          <!-- <strong>Investment opportunity:</strong> min $500k, max $2mm -->
          <strong>Investment opportunity:</strong> Seed round ($500K - $2M)
        </div>
        <div class="info-item">
          <strong>Use of funds:</strong> Salary, marketing & customer acquisition. Larger seed enables engineering expansion, enterprise sales hire.
        </div>
        <div class="info-item">
          <strong>Projected margins:</strong> 85% (near-zero COGS, high automation)
        </div>
      </div>
      <div class="mt-6">
        <div class="section-header">MANAGEMENT TEAM</div>
        <div class="team-member">
          <img src="/images/headshot_brett.jpg" class="team-image" alt="Brett Davies">
          <div class="team-info">
            <div class="font-bold">Brett Davies</div>
            <div class="text-xs italic">Founder</div>
            <div class="text-xs">Early Uber Operations leader (5+ years), built global driver systems. Senior roles at Lime, Cornershop, GoPuff. Co-founded Ukraine Defense Fund ($77M year 1).</div>
          </div>
        </div>
        <div class="team-member">
          <img src="/images/headshot_will.jpg" class="team-image" alt="Will Feldmen">
          <div class="team-info">
            <div class="font-bold">Will Feldmen</div>
            <div class="text-xs italic">Founding Engineer</div>
            <div class="text-xs">Top performer at GauntletAI, technical lead on parallel systems. Expertise in high-performance message buses and distributed systems.</div>
          </div>
        </div>
      </div>
      <div class="mt-6">
        <div class="section-header">CURRENT STATUS</div>
        <!-- <div class="text-xs">
          Describe what you've achieved to this point. Do you have a prototype? Have you received any customer feedback?
        </div> -->
        <div class="text-xs">
          Core technology developed with 750ms latency achievement. Active discussions with NBA, Twitch, Assist, and MLBAM (pending). Each conversation generating additional leads and investor introductions. Strategic advisor from NBA onboard. Pending advisors from NBCUniversal, and major sports networks.
        </div>
      </div>
    </div>
    <div class="startup-right-col">
      <div class="right-section">
        <div class="section-header">MARKET & OPPORTUNITY</div>
        <div class="text-xs mt-1">
          $80B TAM across media, broadcasting, enterprise, and education sectors. Initial focus on $30B SAM in sports and entertainment, where all major leagues seek improved fan experiences. Growing demand for multilingual capabilities and accessibility compliance creates massive scaling opportunity.
        </div>
      </div>
      <div class="right-section">
        <div class="section-header">CHALLENGE & SOLUTION</div>
        <div class="text-xs mt-1">
          Sports and entertainment fans miss critical moments due to unbearable captioning delays (15-20+ seconds). Current solutions have 13pp lower accuracy with domain terminology and fail to meet ADA/FCC requirements. Our AI-powered pipeline solves this with 750ms latency while maintaining superior accuracy - 20x faster than industry standard.
        </div>
      </div>
      <div class="right-section">
        <div class="section-header">PROGRESS & PARTNERSHIPS</div>
        <div class="text-xs mt-1">
          Core technology achieves 750ms latency milestone.
          Active discussions with NBA, Twitch, and Assist.
          Strategic advisor from NBA onboard.
          Plugin architecture complete and tested.
          Growing pipeline of media and sports prospects.
        </div>
      </div>
      <div class="right-section">
        <div class="section-header">BUSINESS MODEL</div>
        <div class="text-xs mt-1">
          Enterprise subscription & usage-based pricing with exceptional unit economics. Multiple revenue streams: core translation & captioning service, plugin marketplace licensing, analytics platform, data brokering. Clear path to $100M ARR in 18 months through sports/media expansion and growing accessibility requirements.
        </div>
      </div>
      <div class="right-section">
        <div class="section-header">TECHNOLOGY & ROADMAP</div>
        <div class="text-xs mt-1">
          <strong>Core Architecture:</strong>
          High-frequency trading inspired message bus.
          Parallel processing with intelligent load balancing.
          Provider redundancy and failover systems.
          Dynamic plugin system for real-time reconfiguration.
          Native integration with professional A/V workflows.
          <strong>2025 Roadmap:</strong>
          Q1: Multi-language support with same latency (in final testing).
          Q2: Release API and self-onboarding for new customers.
          Q2: Release plugin marketplace and developer SDK.
          Q3: Achieve 750ms end-to-end latency at scale.
        </div>
      </div>
      <div class="right-section">
        <div class="section-header">COMPETITIVE MOAT</div>
        <div class="text-xs mt-1">
          Technical barriers create defensible advantage through: proprietary latency optimization, context-aware AI models, and flexible plugin architecture. AI-first team operating at exceptional velocity. Legacy vendors cannot match our speed or adaptability to customer needs.
        </div>
      </div>
      <div class="right-section">
        <div class="section-header">EXIT OPPORTUNITIES</div>
        <div class="text-xs mt-1">
          Multiple exit paths through major media companies (Disney, NBCUniversal, Warner Bros Discovery), tech giants expanding into live media (Amazon, Microsoft, Meta), or sports tech leaders (MLBAM). Strategic advisors position us well for future M&A discussions.
        </div>
      </div>
    </div>
  </div>
</div>
