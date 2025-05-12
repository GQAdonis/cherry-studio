# Prometheus Studio Rebranding Plan

This document outlines the comprehensive plan for rebranding Cherry Studio as Prometheus Studio, following the Prometheus Agentic Growth Solutions branding guide.

## 1. Application Identifiers

- Update `appId` to `ai.prometheusags.PrometheusStudio` in electron-builder.yml
- Update `productName` to "Prometheus Studio" in electron-builder.yml
- Update `executableName` to "Prometheus Studio" in electron-builder.yml
- Update package.json name to "prometheus-studio" (lowercase with hyphens for npm compatibility)
- Update description, author, and homepage in package.json

## 2. Visual Elements

### 2.1 Color Palette Implementation

Implement the Prometheus color palette in the application's CSS:

| Color Name | Hex Value | Usage |
|---|---|---|
| Navy | #0A192D | Primary brand color |
| Yellow | #FFDD00 | Secondary color |
| Orange | #FF5500 | Accent, used in gradient |
| Red | #FF4D4D | Error states, used in gradient |
| Turquoise | #00A3A3 | Tertiary accent color |
| Light Blue | #4D9FFF | Primary color in dark mode |
| Lavender | #9D8DF1 | Optional accent color |
| Ultra Light Gray | #F8F8F8 | Background in light mode |
| Light Gray | #F5F5F5 | Card background in light mode |
| Medium Gray | #CCCCCC | Borders, inputs in light mode |
| Dark Gray | #333333 | Text color, borders in dark mode |
| Light Navy | #0F2440 | Navy variant in dark mode |

### 2.2 Flame Gradient

Implement the distinctive Prometheus flame gradient that transitions from yellow to orange to red to deep navy:

- Top color: #FFDD00 (Yellow)
- Middle-top color: #FF5500 (Orange)
- Middle-bottom color: #FF4D4D (Red)
- Bottom color: #0A192D (Navy)

### 2.3 Logo Implementation

- Replace all Cherry Studio logos with the Prometheus flame logo
- Update favicon and application icons
- Implement the logo in various sizes for different contexts (header, footer, etc.)

## 3. Typography

### 3.1 Font Implementation

- Set up Roboto font for body text
- Set up Proxima Nova font for headings (or use a suitable alternative if not available)
- Create CSS files for both fonts
- Update the main stylesheet to use the new fonts

### 3.2 Typography Specifications

Follow the Tailwind CSS specifications for typography:

| Element | Font | Weight | Size Class | Line Height | Color |
|---|---|---|---|---|---|
| h1 | Proxima Nova | 700 (Bold) | text-4xl | leading-tight | text-prometheus-navy |
| h2 | Proxima Nova | 700 (Bold) | text-3xl | leading-tight | text-prometheus-navy |
| h3 | Proxima Nova | 700 (Bold) | text-2xl | leading-snug | text-prometheus-navy |
| h4 | Proxima Nova | 700 (Bold) | text-xl | leading-snug | text-prometheus-navy |
| h5 | Proxima Nova | 700 (Bold) | text-lg | leading-normal | text-prometheus-navy |
| h6 | Proxima Nova | 700 (Bold) | text-base | leading-normal | text-prometheus-navy |
| Body | Roboto | 400 (Regular) | text-base | leading-relaxed | text-prometheus-navy |
| Small | Roboto | 400 (Regular) | text-sm | leading-normal | text-gray-600 |
| Button | Roboto | 500 (Medium) | text-base | leading-none | varies by button type |
| Link | Roboto | 500 (Medium) | text-base | inherited | text-prometheus-turquoise hover:text-prometheus-lightBlue |

## 4. Internationalization

### 4.1 Mini App Names Translation

Update all Chinese app names in minapps.ts to English:

| Chinese | English |
|---|---|
| 万知 | Wanzhi |
| 智谱清言 | Zhipu Qingyan |
| 百小应 | Baixiaoying |
| 通义千问 | Tongyi Qianwen |
| 跃问 | Yuewen |
| 豆包 | Doubao |
| 海螺 | Hailuo |
| 文心一言 | Wenxin Yiyan |
| 百度AI搜索 | Baidu AI Search |
| 腾讯元宝 | Tencent Yuanbao |
| 商量 | Shangliang |
| 秘塔AI搜索 | Metaso AI Search |
| 天工AI | Tiangong AI |
| 纳米AI | Nami AI |
| 纳米AI搜索 | Nami AI Search |
| 小艺 | Xiaoyi |
| WPS灵犀 | WPS Lingxi |
| 知乎直答 | Zhihu Zhida |
| 当贝AI | Dangbei AI |

### 4.2 Agent Translation

Translate all agent content from Chinese to English:

1. **Group Names**:
   - 职业 → Career
   - 商业 → Business
   - 工具 → Tools
   - 语言 → Language
   - 精选 → Featured
   - 教育 → Education
   - 情感 → Emotion
   - 编程 → Programming
   - 办公 → Office
   - 通用 → General

2. **Agent Prompts**:
   - Translate all Chinese prompts to English while preserving the original meaning and style
   - Ensure all role descriptions, requirements, and instructions are accurately translated
   - Maintain any formatting, bullet points, and sections in the original prompts

3. **Agent Descriptions**:
   - Translate any Chinese-only descriptions to English
   - For bilingual descriptions, ensure the English portion is accurate and complete

### 4.3 Other Text Elements

- Translate any Chinese comments in code files
- Translate release notes in electron-builder.yml
- Translate any other user-facing text elements

## 5. UI Improvements

### 5.1 Knowledge Base Empty State

Improve the empty knowledge base image:
- Add vertical and horizontal centering
- Lighten the image with opacity and brightness adjustments
- Ensure proper spacing and alignment

### 5.2 Form Elements

Update form elements to match the Prometheus design style:
- Use flat, borderless inputs with subtle background fills
- Add boxed shadow for subtle depth
- Implement appropriate hover and focus states
- Use the red accent color for error states

## 6. Documentation

- Create this REBRAND.md file to document the rebranding process
- Update README.md with the new branding information
- Update any other documentation files as needed

## 7. Build Process

- Update the build process to use the new app name
- Fix any hardcoded references to "Cherry Studio" in build scripts
- Ensure the final artifacts have the correct naming

## Implementation Timeline

1. **Phase 1**: Update application identifiers and basic branding elements
2. **Phase 2**: Implement visual elements (colors, logo, typography)
3. **Phase 3**: Translate all Chinese text to English
4. **Phase 4**: Improve UI elements
5. **Phase 5**: Update documentation
6. **Phase 6**: Test and finalize the build process

## Completed Tasks

- ✅ Updated appId, productName, and executableName in electron-builder.yml
- ✅ Updated package.json with new name and information
- ✅ Implemented Prometheus color palette
- ✅ Translated Mini App names from Chinese to English
- ✅ Improved empty knowledge base image with centering and lightening
- ✅ Created REBRAND.md documentation
- ✅ Fixed hardcoded references to "Cherry Studio" in build scripts