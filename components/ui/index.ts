/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  ResumeTailor UI — the primitives. Built once, against docs/DESIGN.md §11, with every state.
 *  Everything after this is assembly. Look at them all at /design.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  HOW TO USE THIS
 *
 *  Type       Never set a size on its own. Use the scale classes: `.doc-*` for the document voice
 *             (Source Serif 4), `.ui-*` for the interface (Public Sans), `.mn-*` for anything the
 *             machine produced (IBM Plex Mono). Each class carries its own tracking and leading.
 *             A number the machine made is mono; a number the person pays is serif.
 *
 *  Colour     Tokens only — var(--ink), var(--ink-muted), var(--rule), var(--mark) … Red is a
 *             proofreader's mark: invalid, removed, destructive. It is never "the brand colour"
 *             and never a button that is not destructive. Primary is ink.
 *
 *  Space      var(--s-1 … --s-13) on a 4px grid. Nothing off the scale.
 *
 *  Radius     var(--r-0) for documents, tables and rules; --r-1 fields and tokens; --r-2 buttons
 *             and panels; --r-3 dialogs. If two adjacent objects share a radius AND a border, one
 *             of them is wrong.
 *
 *  Depth      A rule, then a background step, then an inset, and a shadow last. Two shadows exist.
 *
 *  Density    A surface states its own: put data-density="compact" on the pane, and the controls,
 *             rows and cells inside it change together. A coarse pointer overrides it back to 44px.
 *
 *  Focus      Nothing here defines its own focus style. The one ring lives in globals.css and is
 *             `outline: 2px solid var(--mark)` at 2px offset, on :focus-visible only.
 *
 *  Icons      <Icon name="download" />. Two drawn sizes, 16 and 20 — never scale one to the other.
 *             Emoji are not icons.
 */

export { Icon, Brand, ICON_NAMES, BRAND_NAMES, type IconName, type BrandName } from "./Icon";
export { Button, Spinner, type ButtonProps } from "./Button";
export { Field, Input, Select, Textarea, Checkbox, Radio, type ControlProps } from "./Field";
export { Chip, Token, Badge } from "./Chip";
export { Meter } from "./Meter";
export { Table, type Column } from "./Table";
export { Panel, Well, Sheet, PageBreak, Seal, Rule } from "./Panel";
export { EmptyState, Skeleton, SkeletonRows, Notice } from "./Feedback";
export { Stepper, Tabs, Breadcrumb, Pagination } from "./Nav";
export { Dialog, Drawer, Tooltip, Toast } from "./Overlay";
export { Container, Prose, Editorial, DocumentLayout, ToolLayout, Section } from "./Layout";
export { Eyebrow, H1, H2, Stamp } from "./legacy";
