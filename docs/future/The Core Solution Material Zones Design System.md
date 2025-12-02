## The Core Solution: "Material Zones" Design System

**Base it on Material 3 principles but adapted for your preferences:**

### 1. **Design Token Foundation**

Create a JSON/CSS custom properties file that defines:

```css
/* Material 3 tokens adapted for "borderless zones" */
--surface-container-lowest: hsl(var(--hue) 20% 98%);
--surface-container-low: hsl(var(--hue) 20% 96%);
--surface-container: hsl(var(--hue) 20% 94%);
--surface-container-high: hsl(var(--hue) 20% 92%);
--surface-container-highest: hsl(var(--hue) 20% 90%);

/* Zones use background color steps, not borders */
--zone-transition-duration: 300ms;
--zone-transition-easing: cubic-bezier(0.4, 0, 0.2, 1);
```

**Why this works for AI**: Design tokens are like "constants" - AI assistants understand them across all frameworks.

### 2. **HTMX Component Strategy: Web Components + Alpine**

This is the key breakthrough for HTMX maintainability:

```html
<!-- Define once, use everywhere -->
<template id="chat-bubble-template">
  <div class="chat-bubble" 
       :class="{ 'user': isUser, 'assistant': !isUser }"
       x-data="{ isUser: false }">
    <div class="markdown-content" x-html="marked.parse(content)"></div>
  </div>
</template>

<!-- Use it declaratively -->
<chat-bubble content="Hello **world**" is-user="true"></chat-bubble>
```

**Or use server-side components** (Go templates, Jinja2, Templ):

```go
// Go with Templ
templ ChatBubble(content string, isUser bool) {
  <div class={getBubbleClasses(isUser)} 
       hx-boost="true">
    @markdown.Render(content)
  </div>
}
```

### 3. **The HTMX Component Library You Need**

Check out these emerging solutions:

- **HTMX + Web Components** - Native custom elements work perfectly with HTMX
- **Templ** (for Go) - Type-safe HTML components
- **Jinja/Django components** - If using Python
- **htmx-extensions** - Create reusable behaviors

**For AI maintainability**, document components in a specific format:

```html
<!-- 
COMPONENT: zone-card
PURPOSE: Container with elevated background, no borders
TOKENS: --surface-container-high, --zone-padding
VARIANTS: elevated, flat, interactive
BEHAVIOR: Hover increases elevation by one step
-->
<div class="zone-card zone-card--elevated">
  <!-- content -->
</div>
```

### 4. **Responsive Transition Pattern**

This is your sidebar → bottom nav requirement:

```html
<!-- Desktop: Sidebar -->
<nav class="nav-container" 
     x-data="{ isMobile: window.innerWidth < 768 }"
     @resize.window="isMobile = window.innerWidth < 768"
     :class="isMobile ? 'nav-bottom' : 'nav-sidebar'">
  
  <template x-if="!isMobile">
    <!-- Sidebar items -->
  </template>
  
  <template x-if="isMobile">
    <!-- Bottom nav (max 4 + more) -->
  </template>
</nav>
```

**CSS with smooth transitions:**

```css
.nav-container {
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--surface-container);
}

.nav-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 280px;
  transform: translateX(0);
}

.nav-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  transform: translateY(0);
}
```

### 5. **Complex UI Components for HTMX**

**Chat with Markdown/Code/Mermaid:**

```html
<div class="chat-message"
     x-data="{ 
       content: $el.dataset.content,
       rendered: false 
     }"
     x-init="
       // Render markdown
       $el.querySelector('.md').innerHTML = marked.parse(content);
       // Highlight code blocks
       $el.querySelectorAll('pre code').forEach(hljs.highlightElement);
       // Render mermaid
       mermaid.run({ nodes: $el.querySelectorAll('.mermaid') });
     ">
  <div class="md"></div>
</div>
```

**For XYFlow-style diagrams in HTMX**, consider:

- **Mermaid** for most use cases (AI understands it perfectly)
- **D3.js** for custom needs
- **Embedded React islands** for ReactFlow specifically (using Astro or similar)

### 6. **The AI-Maintainability Secret: Pattern Documentation**

Create a `DESIGN_SYSTEM.md` that AI can reference:

~~~markdown
# Material Zones Design System

## Principles
1. NO BORDERS - Use background color zones (--surface-container-*)
2. Smooth transitions (300ms cubic-bezier)
3. Elevation via background lightness, not shadows
4. Mobile: bottom nav (4 items + more button)

## Component Patterns

### Zone Card
Purpose: Group related content
Classes: .zone-card, .zone-card--elevated
Tokens: --surface-container-high, --zone-padding-lg
Example:
```html
<div class="zone-card zone-card--elevated">
  <h3 class="zone-card__title">Title</h3>
  <div class="zone-card__content">Content</div>
</div>
~~~

## Naming Convention

- Components: `zone-{name}`
- Modifiers: `zone-{name}--{variant}`
- Elements: `zone-{name}__{element}`

```
### 7. **Recommended Tech Stack**

**HTMX/Alpine projects:**
- **Tailwind CSS** with your custom Material 3 tokens
- **Alpine.js** for interactivity
- **Web Components** for reusable complex components
- **Marked.js** + **Highlight.js** for markdown/code
- **Mermaid.js** for diagrams
- **Server-side templating** (Templ, Jinja2) for component organization

**Flutter:**
- Material 3 native implementation
- Share color tokens with web via code generation

**Unified approach:**
- **Design tokens in JSON** → generate CSS variables + Flutter theme
- **Pattern library documentation** that AI can reference
- **BEM-style naming** for AI clarity

### 8. **AI Prompt Template for Maintenance**

When asking AI to modify:
```

Using the Material Zones design system (see DESIGN_SYSTEM.md):

- Use zone-card component pattern
- NO borders, use background color changes
- Smooth 300ms transitions
- Mobile: convert to bottom nav at 768px breakpoint
- Use HTMX for server interactions
- Use Alpine.js for client state

[Your specific request]

```
### 9. **Recommended Libraries for HTMX**

- **hyperscript** - Alternative to Alpine for some behaviors
- **htmx-ext-** - Multi-swap, response-targets for complex UIs
- **Shoelace** - Web components that work with HTMX
- **Preline UI** - Tailwind components adapted for HTMX

## My Recommendation

**Start with this stack:**
1. **Design tokens** (JSON → CSS + Flutter)
2. **Tailwind** with your custom Material 3 tokens
3. **Web Components** for complex reusable components (chat, diagrams)
4. **Alpine.js** for reactivity
5. **Server-side components** (Templ if Go, or Jinja2 if Python)
6. **Pattern documentation** with examples for AI

**For Juris.js**: It's interesting but still very new. I'd wait until it matures more before committing your design system to it.

Want me to generate a starter design token file and some example components to get you started?
```