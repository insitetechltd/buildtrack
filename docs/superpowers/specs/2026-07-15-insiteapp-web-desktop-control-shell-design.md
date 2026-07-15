# InsiteApp Web Desktop Control Shell Design

## Summary

This spec defines the approved first-pass web mockup direction for the InsiteApp web interface. The selected direction is **Option 1: Desktop Control Shell**.

The mockup should present the product as a desktop extension of the current mobile app rather than as a separate SaaS brand. The interface must preserve the implemented mobile app’s visual language: a deep teal structural shell, pale blue workspace surfaces, white operational cards, rounded geometry, compact readable typography, and semantic task-state color cues.

The first mockup deliverable is a desktop admin home / control shell screen that demonstrates the web shell, context controls, dashboard structure, activity density, and task/admin balance.

## Source Inputs

This spec is based on two sources:

1. The approved web product brief in `2026-07-15-insiteapp-web-interface-design.md`
2. The live mobile implementation and adjacent UI references in the repository

When the product brief and the live implementation differ in visual tone, the mockup should follow the **live implementation**.

## Design Goal

Create a desktop-first admin control shell that:

- feels clearly related to the existing mobile app
- gives administrators immediate orientation after login
- keeps organization and project context visible at all times
- supports fast scanning of project health, task queues, and activity
- remains operational and trustworthy rather than promotional

## Approved Direction

The selected layout strategy is **Desktop Control Shell**.

This direction uses:

- a stable left sidebar for primary navigation
- a top context bar for organization, project, search, alerts, and account controls
- a pale work canvas for the main content area
- modular white cards for KPIs, projects, queues, exceptions, and activity

This direction is preferred because it scales the mobile app’s practical task-oriented feel into a clearer desktop information architecture without becoming dashboard-heavy or visually noisy.

## Design Language From The Implemented Mobile App

The web mockup should inherit the following visual rules from the current mobile app:

### Color System

Primary structural colors observed in the implemented app:

- Deep teal: `#08576E`
- Secondary teal/cyan: `#0D6E87`
- Bright accent cyan: `#12A8E0`
- Pale workspace blue: `#E7F4F8`
- Soft white panel tint: `#F8FCFF`
- Dark ink text: `#07111E`, `#0D2630`
- Muted support copy: `#577783`, `#497080`, `#B9D9E4`

Semantic states should remain functional rather than decorative:

- Info / active: blue
- Review / warning: amber
- Overdue / destructive: red
- Complete / success: green

### Surface Treatment

- Structural regions use deep teal
- Main working surfaces use pale blue or soft neutral backgrounds
- Most interactive content lives in white or softly tinted cards
- Borders should be subtle and cool-toned rather than dark

### Shape Language

- Large rounded corners are core to the product identity
- Cards should typically use a medium-large radius equivalent to `rounded-2xl` or `rounded-3xl`
- Buttons and chips should feel compact, tactile, and operational

### Typography

- Headings should be bold but not oversized
- Support text should stay readable and compact
- Section labels may use uppercase, spaced tracking for operational grouping
- The UI should feel scan-friendly for construction-focused users

### Interaction Tone

- Important controls should be visible without menu hunting
- Filters and task states should be legible at a glance
- The product should emphasize clarity and control over visual flair

## Mockup Scope

The first-pass mockup will be a single **admin home / control shell** screen for desktop.

The screen should demonstrate:

- the desktop shell layout
- organization and project context visibility
- admin health and exception scanning
- task pipeline awareness
- recent activity awareness
- quick access to common admin actions

The mockup is not expected to define every screen in the product. It should establish the web system language and the highest-level admin home composition.

## Information Architecture For The Mockup

### 1. Left Sidebar

The sidebar is the primary structural anchor.

Required content:

- product mark and product name
- current workspace label
- primary navigation

Navigation items:

- Dashboard
- Organization
- Projects
- Tasks
- Reports
- Settings

Behavioral intent:

- stable across the product
- clearly selected active section
- visually strong but not overly wide

Visual treatment:

- deep teal background
- light text
- slightly brighter active-state pill or block
- small supporting labels or icons where helpful

### 2. Top Context Bar

The top bar should communicate current scope and provide utility controls.

Required content:

- organization switcher
- current project switcher
- search field
- alerts / notifications entry
- profile / account menu

Behavioral intent:

- organization and project context must never feel hidden
- search should appear immediately available
- the bar should feel lighter than the sidebar, acting as a context layer rather than a second structural shell

### 3. Main Content Canvas

The content area should sit on a pale blue workspace background and use modular white cards.

Recommended content zones:

- top summary / KPI row
- active projects and delivery health
- queue summary
- exceptions / overdue / approvals
- recent activity
- quick actions

## Screen Composition

The desktop admin home should be structured as follows:

### Header Zone

Contains:

- page title such as `Dashboard`
- short supporting line about the selected organization/project
- quick actions on the right, such as `Create Project`, `Invite User`, or `Review Queue`

### KPI Summary Row

A row of compact metric cards showing:

- Active Projects
- Overdue Tasks
- Pending Reviews
- Completed This Week

Rules:

- each card should have strong number hierarchy
- labels stay concise
- status color may be used sparingly in icon or accent form
- avoid overly bright full-card color fills

### Operations Grid

Main middle area should present a 2-column or 3-column dashboard composition containing:

- Active Projects panel
- Queue Overview panel
- Exceptions / Attention Needed panel
- Recent Activity panel

Recommended weighting:

- project and queue panels get the most width
- exceptions and activity can be narrower or stacked

### Quick Actions Panel

A smaller utility region should expose high-frequency actions directly, such as:

- Add Project
- Invite User
- Review Approvals
- Open Tasks

This should feel operational and accessible, not like a promotional CTA section.

## Component Direction

### Sidebar Navigation

- compact vertical item rows
- icons optional but recommended
- active item clearly highlighted
- no excessive dividers

### Context Switchers

- pill-like or rounded segmented surfaces
- clear current label
- dropdown affordance
- visually grouped in the top bar

### KPI Cards

- white card base
- subtle border
- large numeric value
- small uppercase or muted label
- restrained icon treatment

### Projects Panel

- card list or mini-table hybrid
- project name, phase/status, recent activity cue, risk or overdue marker
- easy scan down the column

### Queue Summary

- grouped task buckets with counts
- status chips or numeric blocks
- emphasis on immediate visibility

### Activity List

- row-based operational feed
- timestamp, task/project reference, short event summary
- optional small media thumbnail or status chip

### Exception Cards

- stronger visual emphasis than normal cards
- use amber or red accents sparingly
- maintain readability and low noise

## Visual Rules For The Web Mockup

### Structure

- sidebar is the darkest persistent region
- top bar is lighter and more neutral
- content canvas uses pale blue background
- cards sit clearly above the canvas with subtle separation

### Density

- information density should be higher than mobile
- spacing should remain generous enough for fast scanning
- avoid giant empty areas that make the interface feel generic

### Brand Expression

- the identity should come from shell color, geometry, and disciplined component styling
- do not introduce marketing gradients, hero banners, or decorative illustration

### Status Language

- overdue and attention states should stand out quickly
- semantic colors should appear in chips, markers, icons, or small surfaces
- the interface should never become rainbow-heavy

## Responsive Expectations

The first mockup is desktop-first, but it should be designed to scale down responsibly.

### Desktop

- full sidebar visible
- full top context bar visible
- KPI row and operations grid shown at full density

### Tablet

- sidebar may collapse
- grid should reduce cleanly
- activity and exceptions may stack vertically

### Mobile Web

- not part of this mockup deliverable
- heavy admin density may be reduced in later iterations

## Content Assumptions For The Mockup

Use realistic placeholder operational content for construction/project workflows, such as:

- organization names
- project names
- task counts
- overdue queue counts
- recent review or approval events

Placeholder content should feel believable and product-specific, not generic startup filler.

## Out Of Scope

This spec does not yet define:

- full route architecture
- all admin detail screens
- all regular-user screens
- exact interaction behavior for every component
- implementation code or production-ready front-end structure

## Validation Criteria

The mockup should be considered successful if:

- it feels recognizably connected to the current mobile app
- admins can identify context, health, and next actions quickly
- the screen supports scanning rather than reading-heavy behavior
- the shell feels stable enough for a multi-screen web product
- the visual system could naturally expand into Projects, Tasks, Reports, and Settings

## Next Step

After review of this spec, the next step is to create a mockup plan and then generate the first-pass web screen on the canvas using this design direction.
