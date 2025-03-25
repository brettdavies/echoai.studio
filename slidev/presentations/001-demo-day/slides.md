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
  @apply font-semibold underline;
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

.market-funnel {
  @apply relative w-full flex items-center justify-center gap-4 mt-8;
}

.funnel-section {
  @apply relative p-4 text-center text-white font-semibold rounded-lg transform transition-all duration-300;
  height: 100px;
}

.tam {
  @apply bg-[#4B0082];
  width: 40%;
}

.sam {
  @apply bg-[#0057B7];
  width: 30%;
}

.som {
  @apply bg-[#2b9348];
  width: 20%;
}

.market-value {
  @apply text-3xl font-bold mb-1;
}

.market-label {
  @apply text-lg opacity-90;
}
</style>

# echoAI

## Low Latency Real-Time Transcription For Live Events

<p>&nbsp;</p>

<div class="grid-layout mt-4 text-xl">
<div>
<v-click>

## Problem

- Fans miss critical moments
- Live captioning has 15-20+ second delay
- Accuracy **-13pp** lower domain terminology
- ADA / FCC regulations unmet

</v-click>
</div>

<div>
<v-click>

## Solution

- **750ms latency** - 20x faster than industry
- Industry-leading accuracy
- Native pro audio/video workflow integration
- Extensible plugin architecture

</v-click>
</div>
</div>

<div class="absolute bottom-10">
GauntletAI Demo Day Pitch
</div>

---
layout: default
class: text-white
---

# Market Validation

<div class="mb-4 text-xl">
In just 2 weeks:<br/><br/>
Conversations with stakeholders representing 100s of millions of consumers:
</div>

<div class="grid gap-4 text-xl">
<div>

- **NBA**: Translation in multi-languages

- **Twitch**: Zero-effort value add for creators

- **Assist**: Zero-effort value add for viewers

- **MLBAM**: Best-in-class sports tech (upcoming conversation)

</div>
</div>

<div class="mt-4 text-xl">
Each conversation generates 2+ additional leads and investor introductions
</div>

---
layout: default
class: text-white
---

# Market Opportunity

<div class="market-funnel">
  <div class="funnel-section tam">
    <div class="market-value">$80B</div>
    <div class="market-label">TAM</div>
  </div>
  <div class="funnel-section sam">
    <div class="market-value">$30B</div>
    <div class="market-label">SAM</div>
  </div>
  <div class="funnel-section som">
    <div class="market-value">$10B</div>
    <div class="market-label">SOM</div>
  </div>
</div>

<div class="grid-layout mt-8 text-xl">
<div>

## Media & Broadcasting

- Live captioning & translation for global audiences
- Enhanced viewer engagement & compliance
- **\~$25B** market potential

</div>
<div>

## Enterprise & Education

- Accessibility for multilingual teams & students
- On-demand analysis & training content
- **\~$5B** market potential

</div>
</div>

---
layout: default
class: text-white
---

# Technical Differentiation

<div class="mb-4 text-xl">
AI-powered throughout the pipeline combined with AI-first team = <strong>insurmountable moat</strong>
</div>

<div class="grid-layout mb-10 text-xl">
<div>

- **Speed**: 750ms vs industry 15-20+ seconds
- **Accuracy**: Context-aware for domain terms
- **Redundancy**: Multiple providers
- **Flexibility**: Dynamic plugins without restart

</div>
<div>

- EOY target 750ms for e2e captioning
- Native integration with pro workflows
- Technical barriers create defensible moat
- Legacy vendors can't adapt quickly enough

</div>
</div>

<div class="mt-6">

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
    FA --> C[Caption Processing]

    linkStyle default stroke-width:2px
    linkStyle 1,3,4,8 stroke-width:2px,stroke-dasharray:10

    style IS fill:#4B0082,stroke:#333,color:white,stroke-width:2px
    style AS fill:#4B0082,stroke:#333,color:white,stroke-width:2px
    style VS2 fill:#4B0082,stroke:#333,color:white,stroke-width:2px
    style T1 fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style T2 fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style T3 fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style TE fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style TL fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style C fill:#2b9348,stroke:#333,color:white,stroke-width:2px
    style FA fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style PO fill:#d00000,stroke:#333,color:white,stroke-width:2px
```

</div>

---
layout: default
class: text-white
---

# Founding Team

<div class="grid-layout">
<div>

<div class="flex flex-col gap-4">
  <div class="flex gap-4">
    <img src="/images/headshot_brett.jpg" alt="Brett" class="rounded-circle w-24 h-24" />
    <div>
      <h2 class="mb-1">Brett &mdash; Founder</h2>
      <strong>brett@echoai.studio</strong>
      <ul class="text-base">
        <li>Early Uber leader (pre-uberX, 5 years)</li>
        <li>Built global driver systems:<br/>Onboarding, Quality, Engagement</li>
        <li>Senior at Lime, Cornershop, GoPuff</li>
        <li>Co-founded Ukraine NP ($77M year 1)</li>
      </ul>
    </div>
  </div>
</div>

</div>
<div>

<div class="flex flex-col gap-4">
  <div class="flex gap-4">
    <img src="/images/headshot_will.jpg" alt="Will" class="rounded-circle w-24 h-24" />
    <div>
      <h2 class="mb-1">Will &mdash; Founding Engineer</h2>
      <strong>will@echoai.studio</strong>
      <ul class="text-base">
        <li>Top performer at GauntletAI</li>
        <li>Trajectory to become Top 1% engineer</li>
        <li>Technical lead on parallel systems</li>
        <li>Expertise in high-performance systems</li>
      </ul>
    </div>
  </div>
</div>

</div>
</div>

<p>&nbsp;</p>

<div class="mt-4">
  <h3 class="mb-2">Strategic Advisors</h3>
  <div class="grid grid-cols-3 gap-2">
    <div>
      <p class="font-bold text-sm mb-0 text-xl">Jessica Doyle</p>
      <ul class="text-sm">
        <li>Digital Growth & Marketing Advisor</li>
        <li>Former VP NBA, Twitch, Cameo </li>
      </ul>
    </div>
    <div>
      <p class="font-bold text-sm mb-0 text-xl">Unannounced</p>
      <ul class="text-sm">
        <li>Media strategy & M&A advisory</li>
        <li>VP TV & Streaming at NBCUniversal</li>
      </ul>
    </div>
    <div>
      <p class="font-bold text-sm mb-0 text-xl">Unannounced</p>
      <ul class="text-sm">
        <li>Seasoned Live Event Executive</li>
        <li>Retired EVP at Pac-12, CBS, Disney, ESPN</li>
      </ul>
    </div>
  </div>
</div>

---
layout: default
class: text-white
---

# The Ask & Revenue Path

<div class="mb-5">
Raising seed round for minimal team expansion, marketing, customer acquisition
</div>

<div class="grid-layout mb-10">
<div>

## Revenue Streams

- Enterprise captioning & translation
- Licensing fees from plugin marketplace
- Subscription-Based Analytics
- Data brokering

</div>
<div>

## Unit Economics

- UE positive from day one
- Superior Gross Margins
- Optimized Cost Structure
- Scalable Cash Flow Engine

</div>
</div>

<div class="text-xl text-center">
Clear path to <strong>$100 million ARR</strong> in 18 months
</div>

<div class="absolute bottom-5 right-5">
  <a href="https://echoai.studio" class="text-xl font-bold">echoai.studio</a>
  <div class="mt-2 relative">
    <!-- <div class="absolute -left-71 top-8 text-right">
      <p class="text-sm">Live demo streaming on our website</p>
    </div>
    <span class="text-xl absolute -left-9 top-12">→</span> -->
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://echoai.studio" alt="echoAI Contact" class="w-34 h-34"/>
  </div>
</div>
