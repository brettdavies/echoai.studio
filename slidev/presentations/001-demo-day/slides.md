---
theme: default
title: echoAI - Real-time Live Audio Transcription
fonts:
#   sans: 'Inter'
  weights: '300,400,500,600,700'
css: unocss
colorSchema: dark
layout: cover
background: black
class: text-white
themeConfig:
  primary: '#8a2be2'
---

<style>
:root {
  --background: 0 0% 0%;
  --foreground: 0 0% 100%;
  --primary: 265 89% 50%;
  --primary-foreground: 0 0% 100%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 0 0% 15%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 12 6.5% 15.1%;
  --accent-foreground: 0 0% 98%;
}

h1 {
  @apply font-bold text-[hsl(var(--primary))];
}

h2, h3 {
  @apply font-semibold text-white;
}

strong {
  @apply text-[hsl(var(--primary))] font-semibold;
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

.mermaid-diagram {
  @apply w-full overflow-visible flex justify-center;
}
</style>

# echoAI

Low Latency Real-Time Transcription For Live Events

<div class="absolute bottom-10">
GauntletAI Demo Day Pitch
</div>

---
layout: default
class: text-white
---

# The Problem

- **Sports & entertainment fans miss critical moments**
<!-- @note: ASH THINKS BIGGEST MOMENT why low latency high accuraacy is required, tell story -->

- Live transcription has unbearable delays (15-20+ seconds)
- Transcriptions are unreliable with domain specific terminology
- Accuracy plummets when trying to go faster
- Accessibility requirements unmet by current tech

---
layout: default
class: text-white
---

# Our Solution

echoAI delivers ultra-fast audio transcription with just **750ms latency** - making real-time interaction possible.

- 20x faster than industry standard
- Maintains high accuracy despite speed
- Native integration with pro audio/video workflows
- Extensible plugin architecture
- EOY target: 750ms for end-to-end captioning

TBW

- Core captioning service launch
- Enterprise sports & entertainment focus
- Expand plugin ecosystem

---
layout: default
class: text-white
---

# How It Works
<!-- PRACTICE REQUIRED 
conenction betwen HFT and Transcription needs to be more clear -->
```mermaid
graph LR
    IS[Input Stream] --> AS[Audio Stream]
    IS --> VS2[Video Stream]
    
    AS --> T1[Provider A]
    AS --> T2[Provider B]
    AS --> T3[Provider C]
    
    T1 --> TE[Transcript Enrichment]
    T2 --> TE
    T3 --> TE
    
    TE --> TL[Translation]
    TE --> C[Caption Processing]
    TL --> C
    
    VS2 --> FA[Frame Analysis]
    
    C --> PO[Production Output]
    FA --> PO
    
    linkStyle default stroke-width:2px
    linkStyle 1,4,8 stroke-width:2px,stroke-dasharray:10
    
    style IS fill:#9b5de5,stroke:#333,color:white,stroke-width:2px
    style AS fill:#4B0082,stroke:#333,color:white,stroke-width:2px
    style VS2 fill:#4B0082,stroke:#333,color:white,stroke-width:2px
    style T1 fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style T2 fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style T3 fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style TE fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style TL fill:#4B0082,stroke:#333,color:white,stroke-width:2px
    style C fill:#2b9348,stroke:#333,color:white,stroke-width:2px
    style FA fill:#2b9348,stroke:#333,color:white,stroke-width:2px
    style PO fill:#d00000,stroke:#333,color:white,stroke-width:2px
```

- High-frequency trading inspired message bus
- Parallel processing with intelligent load balancing
- Context-aware AI for improved accuracy
- Aggregation of multiple providers for redundancy
- Dynamic plug-ins can be reconfigured on the fly

---
layout: default
class: text-white
---

# Traction & Validation

In just 2 weeks:

- **NBA**: Massive alignment, excited about partnership
- **Twitch**: Exploring integration for creators
- **Assist**: Pending partnership for livestreaming creators
- **MLBAM**: Upcoming conversation (best-in-class sports tech)

Each conversation generates 2+ additional leads and offers for investor introductions

## Strategic Advisors
<div class="grid grid-cols-3 gap-4 mt-4">
  <div>
    <p class="font-bold mb-0">VP Digital Growth at NBA</p>
    <p class="mt-0">Digital fan engagement expert</p>
  </div>
  <div>
    <p class="font-bold mb-0">VP TV & Streaming at NBCUniversal</p>
    <p class="mt-0">Media strategy & M&A advisory</p>
  </div>
  <div>
    <p class="font-bold mb-0">Seasoned Live Event Executive</p>
    <p class="mt-0">Former EVP at Pac-12, CBS, ABC (Disney / ESPN)</p>
  </div>
</div>

---
layout: default
class: text-white
---

# Market Opportunity

[Market size funnel chart: TAM → SAM → SOM]
<p>&nbsp;</p>
<p>&nbsp;</p>
<p>&nbsp;</p>
<p>&nbsp;</p>

<div class="grid-layout">
<div>

## Sports Entertainment

- $X billion market
- All leagues seeking improved fan experiences
- Long tail of smaller leagues = massive market

</div>
<div>

## Conferences & Events

- $Y billion market
- Live captioning for accessibility compliance
- Multilingual capabilities expand reach

</div>
</div>

---
layout: default
class: text-white
---

# Business Model

<div class="grid-layout">
<div>

- Enterprise subscription & usage-based pricing
- Exceptional unit economics:
  - UE positive from day 1
  - Near-negligible COGS
  - Higher margins than typical SaaS

</div>
<div>

<!-- [Pricing tiers and margin visualization] -->

</div>
</div>

---
layout: default
class: text-white
---

# Competitive Advantage

[2x2 matrix positioning echoAI vs competitors]

- **Speed**: 750ms vs industry 15-20+ seconds
- **Accuracy**: Context-aware AI outperforms generic solutions
- **Integrations**: Native professional workflow compatibility
- **Plugin Framework**: No restart required, parallel processing
- **AI-First Team**: Cracked AI Engineers operate at 20x speed

---
layout: two-cols
class: text-white
---

# Founding Team

<div class="flex justify-center pb-4">
  <img src="/images/headshot_brett.jpg" alt="Brett" class="rounded-circle w-40 h-40" />
</div>

## Brett (Founder)

- Early Uber Operations leader (5+ years)
- Built global driver systems from scratch
- Senior roles at Lime, Cornershop, GoPuff
- Co-founded Ukraine Defense Fund ($77M year 1)
- Reliable logistics network - Activated & deployed Elon's donated Starlinks

::right::

<p>&nbsp;</p>
<div class="flex justify-center pb-4">
  <img src="/images/headshot_will.jpg" alt="Will" class="rounded-circle w-40 h-40" />
</div>

## Will (Founding Engineer)

- Rising engineering talent
- Top performer at GauntletAI
- Technical lead on parallel processing systems
- Expertise in high-performance message buses
- Trajectory to become Top 1% engineer

---
layout: default
class: text-white
---

# Why Now?

- AI models finally capable of required speed & accuracy
- Sports leagues prioritizing fan experience innovation
- Legacy captioning vendors can't adapt quickly
- Technical barriers to entry create defensible moat
- ADA/FCC regulations increasingly enforced

---
layout: default
class: text-white
---

# The Ask

Raising seed round:

- Minimal team expansion (1x engineering & 1x enterprise sales)
- Marketing & brand awareness
- Customer referral incentives
- Domain-specific model development

## Revenue Streams

- Enterprise audio captioning & translation services
- Plugin marketplace licensing fees
- Data analytics & real-time insights platform

Clear path to $100 million ARR in 18 months

---
layout: center
class: text-center text-white
---

# <span class="text-[hsl(var(--primary))]">echoAI</span>

We're building the real-time AI layer that powers the next generation of live media

<p>&nbsp;</p>

<div class="text-xl mt-4">
  <a href="https://echoai.studio" class="text-3xl font-bold">echoai.studio</a>
</div>

<div class="flex flex-col items-center justify-center mt-4">
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://echoai.studio" alt="echoAI Contact" class="w-48 h-48"/>
</div>
