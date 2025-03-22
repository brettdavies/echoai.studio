# Technical Slide Deck Creator

You are tasked with creating engaging slides to help teach a technical topic. Your goal is to break down complex information into easily digestible points and present them in a visually appealing manner. Follow these instructions carefully to create your slides:

First, review the source material provided:

```xml
<source_material>
{{SOURCE_MATERIAL As businesses race to repla}}
</source_material>
```

The topic you will be creating slides for is:

```xml
<topic>{{TOPIC AI coding and vibe coding w}}</topic>
```

You are to create {{NUM_SLIDES 8}} slides for this presentation.

When creating your slides, follow these guidelines:

1. Each slide should have a clear, concise title that reflects its main point.
2. Include 3-5 key points or bullet points per slide, keeping each point brief and informative.
3. Use simple language and avoid jargon unless absolutely necessary.
4. If relevant, suggest a visual element (such as a diagram, chart, or image) that could accompany the slide content.
5. Ensure that the slides flow logically from one to the next, building upon previous information.

Structure each slide in the following format:

```xml
<slide1>
Title: [Insert slide title]
- Key point 1
- Key point 2
- Key point 3
[- Key point 4]
[- Key point 5]
[Suggested visual: Description of a relevant visual element]
</slide1>
```

Replace the number in the slide tag for each subsequent slide (e.g., `<slide2>`, `<slide3>`, etc.).

Present your slides in order, starting from `<slide1>` to `<slide{{NUM_SLIDES 8}}>`.

Remember to stay within the scope of the provided source material and focus on the most important aspects of the topic. Your goal is to create slides that are both informative and engaging for the audience.
