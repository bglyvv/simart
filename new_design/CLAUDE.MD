SİMART — Claude Code Project Instructions
Project overview
SİMART is a family digital wellbeing platform.

Current application: https://simarttest.netlify.app/

Primary language: Azerbaijani (az). Secondary language: English (en).

The platform helps parents and families develop healthier digital habits.

Main objective
Completely redesign the existing SİMART application for web and mobile.

Create a premium, minimal, elegant user experience inspired by:

Apple Human Interface Guidelines
Linear
Things 3
Apple Screen Time
Do not copy these products. Develop a distinctive SİMART identity.

Design principles
Minimalism.
Generous whitespace.
Clear visual hierarchy.
Premium typography.
Subtle transitions.
Accessible contrast.
Responsive layouts.
Consistent components.
Family-friendly but not childish.
Privacy-conscious design.
Brand identity
Product name: SİMART

Tagline: Ailənin rəqəmsal vərdiş dünyasıdır.

Personality:

Trustworthy
Calm
Intelligent
Premium
Human
Approachable
Technology instructions
First inspect the existing repository.

Identify:

Current framework
Package manager
Routing
Existing authentication
Backend/API integrations
Existing reusable components
Current application structure
Preserve working functionality.

Do not replace the backend or authentication system without a clear reason.

Prefer the existing technology stack unless there is a compelling technical reason to change it.

Design system
Primary: #171717 White: #FFFFFF Background: #F5F5F7 Secondary background: #FAFAFA Sage accent: #A7B8A0 Sand accent: #D8C9B5 Muted text: #777777 Border: #EAEAEA

Typography:

Inter for web
SF Pro where available on Apple platforms
Use sensible system fallbacks
Corner radius:

Inputs: 10px
Cards: 16px
Large panels: 20px
Use restrained shadows and thin borders.

Main application modules
Authentication
Registration
Password recovery
Onboarding
Parent dashboard
Family management
Child profiles
Digital habits
Goals and achievements
Statistics and reports
Notifications
Account settings
Privacy settings
Web requirements
Responsive desktop layout.
Sidebar navigation.
Main dashboard with clear hierarchy.
Multi-column layouts where appropriate.
Accessible forms.
Responsive tables and charts.
Mobile requirements
Mobile-first interaction patterns.
Bottom navigation.
Single-column layouts.
Large touch targets.
Simplified analytics.
Short onboarding steps.
Safe-area-aware layouts.
Azerbaijani UI language
Use natural Azerbaijani language.

Examples:

Ana səhifə
Ailəm
Rəqəmsal vərdişlər
Statistikalar
Məqsədlər
Bildirişlər
Parametrlər
Daxil ol
Qeydiyyatdan keç
Şifrəni unutmusunuz?
Ailə üzvü əlavə et
Use proper Azerbaijani characters: ə, ı, ö, ü, ş, ç, ğ.

Important implementation rules
Inspect before modifying.
Reuse existing functionality.
Avoid unnecessary dependencies.
Build reusable components.
Maintain consistent spacing.
Use semantic HTML.
Implement loading, error and empty states.
Validate forms.
Keep authentication secure.
Do not expose sensitive family or child information.
Never invent device-monitoring capabilities that the backend does not support.
Do not use fake data as real production information.
Development workflow
Work in phases:

Phase 1: Repository audit. Phase 2: Design tokens and shared components. Phase 3: Authentication and onboarding. Phase 4: Desktop dashboard. Phase 5: Family and child profiles. Phase 6: Habits, goals and analytics. Phase 7: Mobile responsive experience. Phase 8: Settings, accessibility and QA.

Before making major changes, explain the proposed implementation.

After each phase:

Check for errors.
Test responsive behavior.
Preserve existing integrations.
Summarize completed work.
Final quality standard
SİMART should look like a professionally designed premium SaaS product, not a generic admin template.

Prioritize clarity, simplicity, trust and a coherent family wellbeing experience.