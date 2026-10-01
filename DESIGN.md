---
name: Nirnay
description: A PW-native support-triage workspace: PW's production tokens, a three-pane helpdesk, and plain-word reasons in place of model numbers.
colors:
  primary: "#5a4bda"
  primary-600: "#4437b8"
  primary-700: "#312596"
  primary-200: "#b2a9ff"
  primary-100: "#d2ccff"
  primary-50: "#f1efff"
  primary-25: "#f8f7ff"
  text: "#1b2124"
  text-2: "#3d3d3d"
  text-3: "#5e6166"
  border: "#eaecef"
  border-strong: "#d9dce1"
  border-hover: "#b5bbc5"
  surface: "#ffffff"
  canvas: "#f8f8f8"
  hover: "#f4f5f7"
  error: "#bf2734"
  error-bg: "#fee7e9"
  error-border: "#f3c4c8"
  warning: "#9f741f"
  warning-bg: "#fff6e5"
  warning-border: "#f4d392"
  success: "#1b7938"
  success-bg: "#dff1e4"
  success-border: "#adcfb7"
  info: "#037cbf"
  info-bg: "#f1f5fe"
  series-1: "#5a4bda"
  series-2: "#037cbf"
  series-3: "#ec4a0a"
typography:
  headline:
    fontFamily: "Reddit Sans, Noto Sans Devanagari, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Reddit Sans, Noto Sans Devanagari, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  title-sm:
    fontFamily: "Reddit Sans, Noto Sans Devanagari, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  reading:
    fontFamily: "Reddit Sans, Noto Sans Devanagari, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Reddit Sans, Noto Sans Devanagari, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\""
  body-sm:
    fontFamily: "Reddit Sans, Noto Sans Devanagari, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Reddit Sans, Noto Sans Devanagari, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
  section-label:
    fontFamily: "Reddit Sans, Noto Sans Devanagari, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.06em"
  kpi:
    fontFamily: "Reddit Sans, Noto Sans Devanagari, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "9999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "20px"
  s6: "24px"
  s8: "32px"
  s10: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
    typography: "{typography.body-sm}"
  button-primary-hover:
    backgroundColor: "{colors.primary-600}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-outline-hover:
    backgroundColor: "{colors.primary-50}"
  button-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-sm:
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "30px"
    typography: "{typography.label}"
  tag-urgent:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "22px"
    typography: "{typography.label}"
  tag-needs-you:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "22px"
  tag-auto-resolved:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "22px"
  tag-neutral:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "22px"
  tag-primary:
    backgroundColor: "{colors.primary-50}"
    textColor: "{colors.primary-600}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "22px"
  filter-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "32px"
  filter-chip-selected:
    backgroundColor: "{colors.primary-50}"
    textColor: "{colors.primary-600}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "38px"
  nav-link:
    textColor: "{colors.text-2}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "38px"
  nav-link-active:
    backgroundColor: "{colors.primary-50}"
    textColor: "{colors.primary}"
  ticket-row-active:
    backgroundColor: "{colors.primary-50}"
    rounded: "{rounded.md}"
    padding: "12px"
---

# Design System: Nirnay

## Overview

**Creative North Star: "The PW Agent Desk"**

Nirnay looks like a tool PW's own support floor could ship tomorrow: PW's production tokens (Reddit Sans, PW purple, white surfaces on a pale grey canvas, hairline borders, 8px corners, pill tags) set into the helpdesk pattern agents already know from Zendesk, Intercom and Freshdesk. Nothing is themed or metaphorical. The design's work is clarity at density: an agent clears a mixed queue all shift, so every pane is quiet by default and colour appears only when it means something.

The system is built on two separations. Purple means "you can act here or you have selected this"; red, amber and green mean ticket state and nothing else. Confidence, which a model would express as a number, is shown to agents as a word with signal bars in neutral ink; the numbers, and the 0.80 threshold, live only on the Quality page where the team lead tunes them.

Light theme only: this is office daytime work. PW's logo is never used; the shell carries Nirnay's own mark and a small "Built for PW Support · Prototype" line.

**Key Characteristics:**
- PW's production palette and Reddit Sans, with Noto Sans Devanagari for Hindi tickets.
- Flat white panes on a #F8F8F8 canvas, separated by 1px hairlines; shadow only on floating things.
- 8px default corners, 12px for cards, full pills for tags and chips.
- Colour is semantic: purple for action and selection, red/amber/green for status only.
- Plain words over model numbers in the agent's view.
- Three-pane helpdesk that degrades to rail, stacked panel, and separate phone screens.

## Colors

PW's production palette: one saturated purple over cool neutrals, with PW's own semantic trio held strictly for ticket state.

### Primary
- **PW Purple** (#5A4BDA): primary buttons, the active nav item's text, links, focus rings, the nav count badge, the selected ticket's avatar, and inline citation markers (which link to sources). Its tints do the quiet work: **Lavender Wash** (#F1EFFF) is the selection fill for nav, ticket rows, filter chips and source IDs; **Lavender Line** (#D2CCFF) borders selected chips and the correct-topic fieldset; **Deep Purple** (#4437B8) is hover on primary and the text on lavender washes.

### Secondary
- **PW Info Blue** (#037CBF on #F1F5FE): informational notices and banners only (for example, "evaluation data is synthetic"). Never a status and never an action.

### Tertiary (chart series only)
- **Series Purple / Series Blue / Series Orange** (#5A4BDA / #037CBF / #EC4A0A): the three lines on the Quality threshold chart. All are PW tokens; the set was run through the dataviz palette validator and passes colour-blind separation and contrast.

### Neutral
- **Ink** (#1B2124): primary text, headings, the chart threshold handle.
- **Graphite** (#3D3D3D): secondary text, message previews, confidence words, ghost buttons.
- **Slate** (#5E6166): captions, timestamps, meta, placeholders, panel section labels (6.1:1 on white).
- **Hairline** (#EAECEF): pane dividers, card borders, table rules, tag borders on neutral.
- **Strong Hairline** (#D9DCE1): input and button borders, scrollbar thumbs; darkens to #B5BBC5 on hover.
- **Surface** (#FFFFFF): panes, cards, composer, bubbles.
- **Canvas** (#F8F8F8): page background and the conversation well.
- **Hover Grey** (#F4F5F7): hover fill on rows, buttons and nav.

### Semantic (status)
- **Urgent Red** (#BF2734 on #FEE7E9, border #F3C4C8): urgent tickets, the "upset" flag, account-change flags, failed trace steps, errors.
- **Needs-You Amber** (#9F741F text on #FFF6E5, border #F4D392): tickets held for a person. The text uses PW's darker warning-700 rather than the brand #EAAA2E so it passes contrast.
- **Resolved Green** (#1B7938 on #DFF1E4, border #ADCFB7): auto-resolved tickets and "official source" marks.

### Named Rules
**The Purple Means Act Rule.** Full-strength PW purple is for primary actions, selection, links and the nav badge. It is never used for status, never for decoration, and never for a chart line that means status.

**The Status Trio Rule.** Red, amber and green are reserved for ticket status (urgent / needs you / auto-resolved) and the upset and account-change flags. No other element may borrow them.

**The Colourless Confidence Rule.** Confidence is never coloured. It is rendered in Graphite ink with a signal-bar icon (High / Medium / Low), so a low-confidence ticket never reads as an alarm.

**The Chart Palette Rule.** Series colours exist only inside charts and are never reused as status; status colours never appear as series.

## Typography

**Display Font:** none (the tool has no display tier)
**Body Font:** Reddit Sans (with Noto Sans Devanagari, then system-ui)
**Label/Mono Font:** Reddit Sans at small sizes; numbers use tabular figures app-wide

**Character:** PW's product face, used as one family across every role. Hierarchy comes from weight (400 / 600 / 700 / 800) and a tight, dense scale, not from a second typeface. Devanagari falls through to Noto Sans so Hindi tickets sit at the same weight and size.

### Hierarchy
- **Headline** (700, 1.5rem, -0.01em): page titles on Quality and Knowledge.
- **Title** (700, 1.25rem): the Inbox list title and the New-ticket card title.
- **Title small** (700, 1.0625rem): conversation header name, panel titles, knowledge card titles, the Nirnay wordmark (800, -0.02em).
- **Reading** (400, 0.9375rem, 1.6): student messages, reply drafts, the composer. Message bubbles cap at 640px.
- **Body** (400, 0.875rem, 1.5, tabular numerals): the dense tool default, nav links (600).
- **Body small** (0.8125rem): previews, facts, table cells, buttons (600).
- **Label** (600, 0.75rem): tags, chips, meta, captions. 11px is the floor, used for timestamps, badges, axis ticks and source IDs.
- **Section label** (700, 0.75rem, 0.06em, uppercase, Slate): headings of the triage panel's blocks and the trace toggle. These are the section headings themselves, never a line above another title.
- **KPI** (800, 1.75rem, -0.02em): the five figures on Quality; 1.4rem on phones.

### Named Rules
**The One Family Rule.** Reddit Sans everywhere; weight carries hierarchy. Do not introduce a display face.

**The No Eyebrow Rule.** Nothing sits above a title as a kicker or category line. Identifiers such as a knowledge article's ID go in the card footer.

## Layout

A full-height app shell: a sticky 232px sidebar and a main area. Spacing runs on a 4px base (4, 8, 12, 16, 20, 24, 32, 40); panes use 16–24px padding, rows 12px, tag gaps 4–6px.

- **Inbox, above 1100px:** three panes. Ticket list (320–360px), conversation (fluid, Canvas well with a pinned composer so "Send reply" is always on screen), triage panel (290–330px). Each pane scrolls on its own inside 100dvh.
- **1100px and below:** the triage panel drops under the conversation; the list stays sticky.
- **Sidebar at 1320px and below:** collapses to a 72px icon rail; labels, footer and the urgent link hide, the badge moves to the icon corner.
- **760px and below:** the sidebar becomes a 60px bottom tab bar with icon-over-label tabs. List and ticket become separate screens with a Back button, and the "why this needs you" callout moves above the student's message.
- **Quality and Knowledge:** centred pages, max 1280px, 32/24/40px padding. Quality uses five KPI cards, then a 1.4fr / 1fr grid (chart beside table); Knowledge is an auto-fill grid of 320px-minimum cards. Both collapse to one column at 1100px; KPIs go 3-up, then 2-up on phones.

## Elevation & Depth

Flat by default, using tonal layering: white panes on the #F8F8F8 canvas, divided by 1px hairlines. Shadows are reserved for things that float above the plane.

### Shadow Vocabulary
- **Rest** (`box-shadow: 0 1px 2px rgba(27, 33, 36, 0.06)`): message bubbles and the selected segment of a segmented control.
- **Float** (`box-shadow: 0 4px 16px -4px rgba(27, 33, 36, 0.12), 0 1px 3px rgba(27, 33, 36, 0.06)`): the reply composer, the New-ticket card, chart tooltips.
- **Focus halo** (`box-shadow: 0 0 0 3px #F1EFFF` with a purple border): focused inputs, search fields, a targeted knowledge card.

### Named Rules
**The Hairline First Rule.** Separate with a 1px Hairline before reaching for a shadow. Cards, KPI tiles and panels rest flat.

## Shapes

Gently rounded and soft-cornered. Buttons, inputs, nav items, rows and callouts use 8px (PW's default); cards, the composer and KPI tiles use 12px; small skeletons and segments 6px; ID badges, citation markers and trace kinds 4px. Tags, filter chips, source chips, the badge and avatars are full pills or circles. Message bubbles are 12px with one 4px corner at the sender's side. Every border is 1px.

## Components

### Buttons
Calm and compact, PW's own vocabulary.
- **Shape:** gently rounded (8px), 36px tall, 16px side padding, 600 weight at 13px.
- **Primary:** filled PW purple with white text; one per view where possible ("Send reply", "Apply threshold").
- **Hover / Focus:** primary darkens to Deep Purple; others take Hover Grey or Lavender Wash; 150ms on the house ease. Focus is a 2px purple outline at 2px offset.
- **Outline:** purple border and text on white, Lavender Wash on hover.
- **Default / Ghost:** white with a Strong Hairline border, or borderless Graphite text.
- **Small:** 30px tall, 12px padding, 12px text. Disabled buttons drop to 50% opacity.

### Chips
- **Status tags:** 22px pills, 12px/600 text, always an icon plus words (flame "Urgent", clock "Needs you", check "Auto-resolved"); tinted fill, matching text and border from the Status Trio.
- **Filter chips / queue views:** 30–32px pills in white with a Hairline border; selected takes Lavender Wash, Lavender Line border and Deep Purple text. Counts sit inside at reduced opacity.
- **Source chips:** Lavender Wash pills with purple-700 text under the composer, truncated at 260px.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Surface on Canvas.
- **Shadow Strategy:** flat (see Elevation); Float only for the composer and New-ticket card.
- **Border:** 1px Hairline; a KPI in error state takes the red wash and border.
- **Internal Padding:** 16–24px.

### Inputs / Fields
- **Style:** white, 1px Strong Hairline, 8px corners, 34–38px tall; search fields carry a leading icon.
- **Focus:** border turns purple with a 3px Lavender Wash halo.
- **Hover:** border darkens to #B5BBC5. Checkboxes and the range slider use purple as the accent.

### Navigation
- **Sidebar:** Nirnay mark and wordmark, then 38px links (Graphite, 600, 14px, 8px corners). Hover takes Hover Grey; active takes Lavender Wash with purple text. The Inbox link carries a purple count pill. A red urgent link with a dot sits under the nav; the footer holds system status and the "Built for PW Support · Prototype" line.
- **Responsive:** 72px icon rail at 1320px and below, 60px bottom tab bar at 760px and below.

### Reply Composer
A floating card (12px corners, Float shadow) pinned at the bottom of the conversation: a title ("Reply to Kunal"), a textarea in the Reading size, the cited articles as Lavender source chips with a Slate note that the student sees numbered sources, an amber line when a cited article is an assumed procedure, and the primary "Send reply" button with its ⌘↵ hint. On a ticket that needs a person it starts empty; a small outline "Use Nirnay's draft" button with a sparkle icon sits in the header, and after use a Deep Purple label says "Nirnay's draft: check it before sending" or "Edited from Nirnay's draft". The agent reads first and asks for help, never the other way round.

### Reopen (auto-resolved callout)
Inside the green "Resolved automatically" callout, a quiet ghost button with an undo icon: "Should a person handle this? Reopen it". A reopened ticket's callout turns amber ("An agent reopened Nirnay's automatic reply"), the sent reply stays in the conversation stamped "reopened by an agent", and the composer asks for a follow-up instead of offering the draft again.

### Ticket Row
Avatar (34px circle, Lavender Wash initials, full purple when selected), name in bold, time right-aligned, a two-line preview in Graphite (Nirnay's one-line summary when the AI wrote one, otherwise the start of the message), then status tags. Hover is Hover Grey; the selected row is Lavender Wash.

### Sort and Filter (queue header)
One quiet row under the search field: on the left, a borderless sort select with an up-down icon (Graphite, 12px/600: "Most urgent first", "Oldest first", "Newest first", "By main topic"); on the right, a 30px "Filter" button in the default button style that turns Lavender Wash with a purple count badge when filters are on. The filter panel floats over the list (Float shadow, 12px corners, 16px padding) with four section-label groups (Topic, Needs attention, Channel, Language) of 28px toggle pills, each with a muted count; a selected pill takes the Lavender selection style with a check icon, and a pill that would leave nothing is disabled at 45% opacity. A fifth group, Batch or centre, sits after Needs attention (see Batch Patterns). Active filters show below as 24px Lavender chips with an ×, plus a plain "Clear all". "By main topic" adds section-label headings with counts inside the list.

### Batch Patterns and Sent Notice
Batches and centres are a filter group ("Batch or centre"), built from the names pulled out of the tickets. One with 3+ tickets in a day is a possible common cause: its pill carries an Info Blue layers icon and comes first, with a one-line Info Blue hint above the group ("3+ tickets in a day: may be one cause"); informational, so blue, never amber or red. After Send, one line under the search field says "Sending to …" in Graphite with a send icon and a 26px default-style "Undo" button, for the five seconds before the reply really goes; then "Reply sent to …" in Resolved Green with a check icon, which clears itself. "Not sent. The reply is back in the composer." after Undo is Graphite with an undo icon (information, not success); a failed send is Urgent Red. All of it is announced politely to screen readers. In the triage panel, a ticket that belongs to a group gets an Info Blue notice ("2 other students wrote about …") with a "Show … tickets" ghost button that applies that batch filter in Needs you.

### Why-This-Needs-You Callout
The first thing in the triage panel: an 8px-cornered box washed in the ticket's status colour, a coloured title with an icon, and each reason in plain words. Never shows a score. On phones it moves above the student's message.

### Help Article (triage panel)
A bordered row (8px corners): a 4px-cornered Lavender ID badge, the title, and a chevron; clicking the row opens it in place to show the article text, its source label (Resolved Green for official PW policy, Slate italic for assumed) and, while replying, an outline "Insert into reply" button, so an agent reads before inserting. A small outline "Cite" button sits beside the row for tagging the agent's own sentence. Six articles show, best match first; "Show all N articles" is a plain purple text button. Under the composer, cited articles appear as Lavender source chips with a Slate note: "The student sees these as numbered sources."

### Threshold Chart (Quality)
Three validated series with direct end labels, a legend with current values, a hover tooltip (Float shadow), and an Ink dashed threshold handle that drags; a purple range slider mirrors it and the value is written as 0.80. Drawn at the container's real pixel width, never scaled.

## Do's and Don'ts

### Do:
- **Do** use PW purple (#5A4BDA) only for primary actions, selection, links, focus and the nav badge.
- **Do** give every status tag an icon and words, never colour alone.
- **Do** show confidence as High / Medium / Low with signal bars in Graphite (#3D3D3D).
- **Do** state why a ticket needs a person in plain words, first in the triage panel.
- **Do** keep numbers and the threshold (written 0.80) on the Quality page.
- **Do** separate panes with 1px Hairlines (#EAECEF) on the #F8F8F8 canvas.
- **Do** keep the composer pinned so "Send reply" is always visible.
- **Do** keep "Built for PW Support · Prototype" in the shell.
- **Do** give every filter option the exact number of tickets it would leave, and disable one that would leave none.
- **Do** hold every reply for five seconds with an Undo button before it goes; a student can't un-receive a message.

### Don't:
- **Don't** show percentages, scores or the threshold anywhere in the Inbox.
- **Don't** colour confidence, and don't use red, amber or green for anything except ticket status and the upset / account-change flags.
- **Don't** reuse chart series colours (#5A4BDA / #037CBF / #EC4A0A) as status.
- **Don't** put an eyebrow or kicker line above a title.
- **Don't** use PW's logo or imply this is an official PW product.
- **Don't** add a dark theme; this is light-only daytime office work.
- **Don't** add themed or metaphorical decoration; the bar is Zendesk, Intercom and Freshdesk.
