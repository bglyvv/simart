SİMART UI/UX Specification
Product objective
Create a premium family digital wellbeing experience for parents.

The interface must make family digital habits understandable, manageable and positive.

Screen 01 — Login
Route: /login

Desktop:

Two-column layout.
Brand introduction on left.
Login form on right.
Minimal visual treatment.
Mobile:

Single column.
Logo at top.
Form below.
Azerbaijani content:

Heading: Ailənizin rəqəmsal dünyasına xoş gəlmisiniz.

Description: Rəqəmsal vərdişləri birlikdə daha sağlam qurun.

Fields:

E-poçt ünvanı
Şifrə
Actions:

Daxil ol
Şifrəni unutmusunuz?
Qeydiyyatdan keçin
States:

Loading
Invalid credentials
Empty fields
Network error
Screen 02 — Registration
Route: /register

Multi-step registration:

Parent information.
Email and password.
Family information.
Optional child profiles.
Completion.
Allow optional child setup to be skipped.

Screen 03 — Onboarding
Route: /onboarding

Use a simple progress indicator.

Introduce:

SİMART functionality.
Family setup.
Digital wellbeing goals.
Privacy information.
Keep each step short.

Screen 04 — Parent dashboard
Route: /dashboard

Sections:

Welcome message.
Family overview.
Today's screen-time summary.
Weekly activity chart.
Child profile summaries.
Habit progress.
Recent notifications.
Prioritize the most important information.

Avoid dashboard clutter.

Screen 05 — Family
Route: /family

Display:

Family members.
Avatar.
Name.
Age, if provided.
Digital wellbeing summary.
Profile action.
Provide an add-family-member action.

Screen 06 — Child profile
Route: /family/:id

Tabs:

Ümumi baxış
Fəaliyyət
Məqsədlər
Parametrlər
Display only information supported by the actual data integrations.

Screen 07 — Digital habits
Route: /habits

Display:

Habit list.
Completion status.
Daily and weekly progress.
Habit creation.
Family habit participation.
Example habits:

Ekransız ailə vaxtı.
Kitab oxumaq.
Yatmazdan əvvəl telefondan uzaq qalmaq.
Fiziki fəaliyyət.
Screen 08 — Goals and achievements
Route: /goals

Display:

Family goals.
Individual goals.
Progress.
Completion history.
Achievement badges.
Use subtle gamification.

Screen 09 — Analytics
Route: /analytics

Filters:

Daily.
Weekly.
Monthly.
Display:

Screen-time trends.
Category breakdown.
Family progress.
Goal performance.
Provide accessible chart alternatives.

Screen 10 — Notifications
Route: /notifications

Display:

Notification history.
Unread status.
Timestamps.
Notification preferences.
Screen 11 — Settings
Route: /settings

Sections:

Account information.
Password and security.
Family preferences.
Notification preferences.
Language.
Privacy.
Data management.
Logout.
Shared layout
Desktop:

Sidebar.
Main content.
Optional contextual panel.
Mobile:

Header.
Main content.
Bottom navigation.
Required UI states
Every data-driven screen must support:

Loading.
Empty.
Error.
Success.
Unauthorized.
Offline where relevant.
Design acceptance criteria
All screens use shared design tokens.
Azerbaijani text is correct.
Mobile layouts are independently optimized.
Forms have proper validation.
No horizontal overflow.
No fake production data.
Existing backend functionality is preserved.
All interactive controls have working actions.