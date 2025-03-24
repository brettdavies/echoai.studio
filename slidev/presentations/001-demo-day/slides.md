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

## Low Latency Real-Time Transcription For Live Events

<p>&nbsp;</p>

<div class="grid-layout mt-4">
<div>
<v-click>

## Problem

- Live captioning has 15-20+ second delays
- Fans miss critical moments
- Accuracy suffers with domain terminology
- ADA requirements unmet

</v-click>
</div>

<div>
<v-click>

## Solution

- **750ms latency** - 20x faster than industry
- High accuracy at unprecedented speed
- Native pro audio/video integration
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

<div class="mb-4">
In just 2 weeks:
</div>

<div class="grid gap-4">
<div>
  
- **NBA**: Massive alignment, excited about partnership

- **Twitch**: Exploring integration for creators

- **Assist**: Pending partnership for livestreaming creators

- **MLBAM**: Best-in-class sports tech (upcoming conversation)

</div>
</div>

<div class="mt-4">
Each conversation generates 2+ additional leads and investor introductions
</div>

---
layout: default
class: text-white
---

# Market Opportunity

<div class="grid-layout mt-8">
<div>

## Sports Entertainment

- $X billion market
- All major leagues seeking improved fan experience
- Long tail of smaller leagues = massive market
- First mover advantage in high-value segment

</div>
<div>

## Conferences & Events

- $Y billion market
- Live captioning for accessibility compliance
- Multilingual capabilities expand reach
- ADA/FCC regulations increasingly enforced

</div>
</div>

---
layout: default
class: text-white
---

# Technical Differentiation

<div class="mb-4">
High-frequency trading inspired architecture creates **defensible technical moat**
</div>

<div class="grid-layout mb-10">
<div>

- **Speed**: 750ms vs industry 15-20+ seconds
- **Accuracy**: Context-aware AI for domain terms
- **Redundancy**: Parallel processing with multiple providers
- **Flexibility**: Dynamic plugins without restart

</div>
<div>

- EOY target: 750ms for end-to-end captioning
- Native integration with professional workflows
- Technical barriers to entry create defensible moat
- Legacy vendors can't adapt quickly enough

</div>
</div>

<!-- @note PRACTICE REQUIRED 
conenction betwen HFT and Transcription needs to be more clear -->
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
      <h3 class="mb-1">Brett &mdash; Founder</h3>
      <ul class="text-sm">
        <li>Early Uber Operations leader (5+ years)</li>
        <li>Built global driver systems from scratch</li>
        <li>Senior roles at Lime, Cornershop, GoPuff</li>
        <li>Co-founded Ukraine Defense Fund ($77M year 1)</li>
        <li>Reliable logistics network - Activated & deployed Elon's donated Starlinks</li>
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
      <h3 class="mb-1">Will &mdash; Founding Engineer</h3>
      <ul class="text-sm">
        <li>Rising engineering talent</li>
        <li>Top performer at GauntletAI</li>
        <li>Technical lead on parallel processing systems</li>
        <li>Expertise in high-performance message buses</li>
        <li>Trajectory to become Top 1% engineer</li>
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
      <p class="font-bold text-sm mb-0">Jessica Doyle</p>
      <ul class="text-sm">
        <li>Digital Growth & Marketing Advisor</li>
        <li>Former VP NBA, Twitch, Cameo </li>
      </ul>
    </div>
    <div>
      <p class="font-bold text-sm mb-0">Media strategy & M&A advisory</p>
      <ul class="text-sm">
        <li>VP TV & Streaming at NBCUniversal</li>
      </ul>
    </div>
    <div>
      <p class="font-bold text-sm mb-0">Seasoned Live Event Executive</p>
      <ul class="text-sm">
        <li>Retired EVP at Pac-12, CBS, ABC (Disney/ESPN)</li>
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
- Plugin marketplace licensing fees
- Data analytics & insights platform

</div>
<div>

## Unit Economics

- UE positive from day 1
- Near-negligible COGS
- Higher margins than typical SaaS

</div>
</div>

<div class="text-xl text-center">
Clear path to <strong>$100 million ARR</strong> in 18 months
</div>

<div class="absolute bottom-5 right-5">
  <a href="https://echoai.studio" class="text-xl font-bold">echoai.studio</a>
  <div class="mt-2 relative">
    <div class="absolute -left-71 top-8 text-right">
      <p class="text-sm">Live demo streaming on our website</p>
    </div>
    <span class="text-xl absolute -left-9 top-12">→</span>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://echoai.studio" alt="echoAI Contact" class="w-34 h-34"/>
  </div>
</div>
