# Design System

## Theme Structure

Themes are defined CSS-first in `src/app.css` using `@plugin "daisyui/theme"`.
The `data-theme` attribute on `<html>` selects the active theme. Theme
preference persists via a `theme` cookie (1-year max-age, SameSite=Lax) and
`localStorage`; the cookie is read server-side in the root `+layout.server.ts`
to set the initial `data-theme` on SSR and prevent FOUC. Logout deletes the
`theme` cookie, resetting the preference to `system`.

Both themes are bespoke "Ink & Ember" palettes (warm paper/ink + ember
accent), each a full `@plugin "daisyui/theme"` block — neither inherits an
unmodified DaisyUI preset.

### Light Theme

| Token                        | Value     |
| ----------------------------- | --------- |
| `--color-base-100`            | `#f7f5f1` |
| `--color-base-200`            | `#efebe3` |
| `--color-base-300`            | `#ddd6c9` |
| `--color-base-content`        | `#1b1d24` |
| `--color-primary`             | `#a6501b` |
| `--color-primary-content`     | `#fbf3ea` |
| `--color-secondary`           | `#3e5c58` |
| `--color-secondary-content`   | `#f2f6f5` |

### Dark Theme

| Token                        | Value     |
| ----------------------------- | --------- |
| `--color-base-100`            | `#14161c` |
| `--color-base-200`            | `#1b1e26` |
| `--color-base-300`            | `#262a34` |
| `--color-base-content`        | `#ece8e1` |
| `--color-primary`             | `#e08a3c` |
| `--color-primary-content`     | `#1b1d24` |
| `--color-secondary`           | `#5b8a83` |
| `--color-secondary-content`   | `#0f1512` |

`primary` is deliberately deeper in the light theme (AA contrast against
white button text) and brighter in dark (reads against ink). `secondary`
(pine/teal) is used sparingly — cover gradients and the odd accent, never a
second loud gradient.

### Custom Tokens (`@theme`)

| Token                  | Value                                                                   | Use                               |
| ---------------------- | ----------------------------------------------------------------------- | --------------------------------- |
| `--font-sans`          | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...` | Base body font                    |
| `--font-serif`         | `ui-serif, Georgia, Cambria, "Times New Roman", serif`                  | Wordmark and page-level headings only, via Tailwind's built-in `font-serif` utility — not a custom `@utility` |
| `--animate-pulse-slow` | `pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite`                        | Slow pulse on decorative elements |

## Custom CSS Utilities

Defined in `app.css`:

| Class                     | Definition                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `.glass-surface`          | `border-white/60 bg-base-100/80 shadow-xl shadow-base-300/25 backdrop-blur-2xl` (dark: `border-white/15 bg-base-200/85 shadow-base-100/35`) — shadows are tinted from the theme's own base palette, never plain black |
| `.glass-card`             | `.glass-surface` + `card rounded-2xl`                                                                                  |
| `.glass-card-interactive` | `.glass-card` + `transition hover:bg-base-100/95` (dark: `hover:bg-base-300/85`)                                      |
| `.feed-shell`             | Root page shell for single-column timelines, detail pages, search, hashtags, and notifications: `max-w-2xl`            |
| `.profile-shell`          | Root page shell for profile pages: `max-w-3xl`                                                                         |
| `.soft-surface`           | Tokenized inline/list surface with `rounded-2xl`, base borders, translucent base background, and dark hover states     |
| `.dropdown-surface`       | Tokenized dropdown/popover surface with base border, translucent base background, shadow, and blur                     |
| `.muted-text`             | Muted text color: `text-base-content/60`                                                                               |
| `.subtle-border`          | Tokenized subtle border color: `border-base-300/80` (dark: `border-white/10`)                                          |
| `.action-pill`            | Standard social/action pill: ghost small button, rounded full, consistent gap/padding and press/hover motion           |
| `.form-input`             | `input min-h-12 rounded-xl bg-base-100/30 focus:border-primary/60 focus:ring-4`                                        |
| `.form-textarea`          | `textarea min-h-28 rounded-xl bg-base-100/30 focus:border-primary/60 focus:ring-4`                                     |

## Layout

| Screen category | Utility          | Width       | Used for                                                             |
| --------------- | ---------------- | ----------- | --------------------------------------------------------------------- |
| Feed shell      | `.feed-shell`    | `max-w-2xl` | Home feed, timelines, post detail, search, hashtags, and notifications |
| Profile shell   | `.profile-shell` | `max-w-3xl` | Profile header plus profile tabs                                     |

Breakpoints: sm=640px, md=768px, lg=1024px. The home feed is single-column
at every width — no sidebar grid.

## Component Inventory

### `Navbar`

Fixed top navigation bar, built as a single unified control cluster rather
than split pieces. `navbar-start` holds the logo lockup — a plain `Brain`
glyph (`text-primary`, no circle/background) beside the `font-serif`
"Cogito" wordmark (`from-primary to-primary/70` gradient) — which doubles as
the Home link. `navbar-end` holds every other action — Search, Compose
(opens `ComposeModal`), Notifications (unread badge), and a generic profile
icon that links directly to the signed-in user's own profile — as plain
icon buttons spaced directly in the bar, deliberately not wrapped in a pill
container: a shared pill chrome around the whole cluster read as one more
repeated rounded shape competing with the circular buttons themselves.
There is no account dropdown. The profile icon is a plain `User` glyph
rather than the `Avatar` component, to avoid a second filled circle. Solid
`bg-primary` fill is reserved for Compose alone as the bar's one
call-to-action; the active route (Search, Notifications, or profile) instead
gets the tinted `bg-primary/20 text-primary` treatment already used for the
active tab in the Settings tab strip, so it never reads as another Compose
button. Icon-only throughout (no text labels, no
breakpoint-dependent sizing) so the bar behaves identically at every width;
`aria-label`/`title` carry the names. Settings and Logout live on the
Settings page, not the navbar. Signed out, the icon cluster is replaced
by "Log In" (ghost) and "Register" (solid `bg-primary`) pill buttons.

### `Avatar`

Circular image with initials fallback when no `profilePhotoKey` is set. Props:
`user`, `size` (Tailwind size classes).

### `PostItem`

Full-width `.glass-card-interactive` post card. Header is `justify-between`:
a left block stacks author name (bold) above `@username` (muted, smaller),
and a right block holds only the owner's delete button, top-aligned with the
name line (empty for posts you don't own). Below it: formatted content,
optional embedded image, a full-width action bar laid out `justify-between`
with the reply/repost/like pills clustered on the left and the timestamp
(muted, small, links to the post) right-aligned, filling the width instead of
leaving dead space next to a narrow pill cluster. Renders `QuoteEmbed` when
`quotePost` is present; renders repost attribution header when `repostOf` is
present. Authenticated users can
double-click an embedded image to like it; the existing like form handles
mutation and rollback, while a large heart overlay uses
`--animate-like-burst`. Renders a small "Replying to @username" line above
the content when `inReplyToUsername` is present (only populated by the
profile Replies tab). A `threaded` prop, used for the post detail page's
reply list, drops the card's rounding/shadow and shrinks the avatar to `sm`
so consecutive replies read as one connected list (relying on the wrapping
`<ul>`'s `divide-y` for separation) rather than a stack of independent cards.

### `ComposePrompt`

Slim clickable row at the top of the home feed and (only for the signed-in
user's own profile) the profile posts tab: avatar + "What's on your mind?"
placeholder text, no real form. Opens the same `ComposeModal` as the navbar's
"+" button via `compose.svelte.ts`'s shared context — a second entry point to
one composer, not a duplicate.

### `UserHeader`

Full-width profile header: cover image, or
`bg-linear-to-tr from-primary via-primary/80 to-secondary` gradient placeholder
when none is set. Below: avatar, display name, `@username`, bio, stat links
(posts, likes, following, followers), and `ControlBar` for follow access. On
your own profile, a single "Settings" pill button (→ `/settings`) is the sole
entry point into account settings, landing on the overview hub — it replaces
the earlier "Edit Profile"/gear pair, since both landed on the same settings
area; Logout lives on the Settings hub, not on the profile.

### `CreatePost`

The composer form: avatar, a roomy multi-line textarea, image upload button
(triggers `POST /uploads`), character count, and submit. Always rendered
expanded — there is no inline collapsed variant; `ComposeModal` is its only
mount point (opened from the navbar's "+" or a `ComposePrompt`), so the
composing experience is identical everywhere it's opened from. Requires an
`onClose` prop, rendered as an inset close (X) button in the card's own
top-right corner and called after a successful post. Its form posts to an
absolute `/?/createPost` action so it works when mounted outside the home
route (`ComposeModal` is mounted once at the `(app)` layout level, not
per-page).

### `FormattedContent`

Inline renderer that linkifies `#hashtag` tokens within post text. Hashtags
render as navigation links to `/search?q=#{tag}`.

### `RepostMenu`

Bottom sheet with two actions, split evenly side by side with a divider:
"Repost" (toggle) and "Quote" (opens `QuoteComposeModal`) — not a DaisyUI
`.dropdown`/`<details>`. Slides up from the card's bottom edge on open
(`transition:slide`, which animates to the sheet's own measured height rather
than a hardcoded distance), absolutely positioned against `PostItem`'s card
(the nearest `position: relative` ancestor), so it scrolls with the card via
native layout instead of JS-tracked coordinates. `PostItem`'s card keeps
`overflow-hidden` since the sheet never needs to escape the card's box. Needs
an explicit `z-index` (not just `position: absolute`) to paint above its
sibling action-row buttons — the action row is a flex container, and flex
items paint by z-index/DOM order regardless of `position: static` vs
`absolute`, unlike normal block layout. Closes on outside click or `Escape`
via a document-level listener attached only while open.

### `QuoteComposeModal`

Full-screen modal with its own independent form (not `CreatePost`) posting
`quoteOfId` to `?/quote`; includes an embedded `QuoteEmbed` preview of the
source post.

### `ComposeModal`

Modal wrapper around `CreatePost` (`onClose={onClose}`), opened from the
navbar's Compose button. Mounted once in the `(app)` layout so it's
reachable from every authenticated page — the sole way to compose a new
post; the home feed has no inline composer of its own.

### `UserItem`

Compact user row: avatar + name + username + follow/unfollow button. Used in
followers/following lists and search results.

### `SearchTypeahead`

Input plus its suggestion/recent-search dropdown read as one combobox: when
the dropdown is open, the input's bottom corners and the dropdown's top
corners flatten (`rounded-b-none` / `rounded-t-none`) and sit flush (no
gap), instead of floating as a separate `.dropdown-surface` card. On the
search page, submitting is Enter-only — there is no separate Search button.
With an empty query, the page shows a "Popular" section (`PostList` of
`GET /search/popular`, paginated like the feed) instead of the results list,
falling back to the empty-query message if there are no popular posts.

### Notifications

Each row's avatar carries a small circular badge overlaid on its bottom-right
corner, color-coded by notification type using the same semantic colors as
`PostItem`'s action bar: `like` → `Heart` (`bg-error/10 text-error`), `repost`
→ `Repeat` (`bg-success/10 text-success`), `reply` → `MessageSquare`
(`bg-primary/10 text-primary`), `follow` → `UserPlus` (`bg-secondary/10
text-secondary`). An unrecognized type falls back to a neutral `Bell` badge
(`bg-base-200 text-base-content`). The badge has a `border-base-100`/
`dark:border-base-200` ring so it reads as a cutout against the card surface,
matching `Avatar`'s own ring treatment on the notifications list.

### Settings

`/settings` is a centered `max-w-xl` card — a single-focus flow like auth,
not a dashboard. The hub (`/settings`) is the sole entry point: an Appearance
theme switcher (System/Light/Dark pill radiogroup), drill-down rows to
Profile/Password/Sessions (`bg-primary/10 text-primary` icon tile +
`ChevronRight`, the same tinted-tile idiom as `SearchResultRow`'s hashtag
row), and a bordered Logout row set off by a divider — no identity summary,
since that's already `UserHeader` on the profile and the Edit Profile form.
Each destination page owns its content and has no shared layout chrome
beyond the centered wrapper — it gets back to the hub via its own
`ArrowLeft` button beside its `h1` (with a one-line subtitle underneath,
matching the hub's own header), not a persistent tab strip.

### Auth, Primitives, Containers

`ConfirmModal` — accessible `role="dialog"` confirmation. `Field` — label +
input wrapper. `FormInput` / `FormTextarea` — apply `.form-input` /
`.form-textarea` utilities. `GlassCard` — `.glass-card` wrapper. `Loading` —
centered spinner. `ToastProvider` — toast queue context and renderer.
`EmptyState` — shared `GlassCard` + centered icon/message empty-state shell
(`icon`, `message`, optional `children` snippet for a CTA); used by the home
feed, search, notifications, `PostList`, and `UserList`. `PostList` /
`UserList` — list containers, falling back to `EmptyState` when empty.
`QuoteEmbed` / `ReplyComposer` — inline post context components. `ControlBar`
— profile action strip.
`TabStrip` — shared `glass-surface tabs tabs-boxed` pill strip (`tabs:
{name, href, isActive, count?}[]`); grid column count derives from
`tabs.length` (a literal 3/4/5-column class lookup, since Tailwind needs each
`grid-cols-N` spelled out to keep it in the build). Used by `ControlBar` (5
tabs — Posts, Replies, Following, Followers, Likes; Replies has no count,
since there's no per-user replies counter), identically at every breakpoint
— no responsive column-switching.

Login/register share `AuthShell` (`eyebrow`/`heading`/`description` props +
a `children` snippet for the page's own `<form>`): a single centered card at
every width, with the `font-serif` "Cogito" wordmark above the eyebrow/
heading/description. No "or" divider between the form and the link to the
other auth page. `AuthShell` owns only the chrome — form fields, validation,
and submission stay in each page.

## Icons

All icons from `@lucide/svelte`. Inline SVG is not used.

Icons never carry an alpha-channel color (no `text-*/NN`, including
`.muted-text`) directly or via an inherited `currentColor`, since a
translucent stroke double-blends where a lucide icon's lines cross and looks
broken. Dim an icon with the `opacity-NN` utility instead — on the icon
itself or on a wrapping element that also holds its label — since `opacity`
composites the element as one opaque group before fading it.
