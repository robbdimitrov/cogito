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
| `.page-shell`             | Root page shell for wide or multi-column app screens: `container mx-auto max-w-5xl px-3 py-3 sm:px-4 sm:py-6`          |
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
| Wide shell      | `.page-shell`    | `max-w-5xl` | Settings/account screens                                             |
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
`bg-primary` fill is reserved for Compose alone, so it reads as the bar's
one call-to-action; the active route (Search, Notifications, or profile)
instead gets the tinted `bg-primary/20 text-primary` treatment already used
for the active item in the Settings sidebar nav — visually distinct from
Compose's solid fill, so an active icon and the compose button never look
interchangeable. Icon-only throughout (no text labels, no
breakpoint-dependent sizing) so the bar behaves identically at every width;
`aria-label`/`title` carry the names. Settings and Logout live in the
Settings sidebar, not the navbar.

### `Avatar`

Circular image with initials fallback when no `profilePhotoKey` is set. Props:
`user`, `size` (Tailwind size classes).

### `PostItem`

Full-width `.glass-card-interactive` post card. Shows author avatar, username,
timestamp, formatted content, optional embedded image, action bar (like with
count, repost with dropdown, reply with count, delete for own posts). Renders
`QuoteEmbed` when `quotePost` is present; renders repost attribution header when
`repostOf` is present. Owner sees a delete button that triggers `ConfirmModal`.
Authenticated users can double-click an embedded image to like it; the existing
like form handles mutation and rollback, while a large heart overlay uses
`--animate-like-burst`.

### `UserCard`

Compact identity strip at the top of the home feed: avatar, display name,
username, a "View" link to the profile, and an inline follower/following/post
count row below a divider. No cover-image treatment — deliberately not a
second copy of the full `UserHeader` profile card.

### `UserHeader`

Full-width profile header: cover image, or
`bg-linear-to-tr from-primary via-primary/80 to-secondary` gradient placeholder
when none is set. Below: avatar, display name, `@username`, bio, stat links
(posts, likes, following, followers), and `ControlBar` for follow access. On
your own profile, "Edit Profile" (→ `/settings/profile`) sits beside a
circular Settings icon button (→ `/settings`); Logout lives at the bottom of
the Settings sidebar, not on the profile.

### `CreatePost`

The composer form: avatar, a roomy multi-line textarea, image upload button
(triggers `POST /uploads`), character count, and submit. Always rendered
expanded — there is no inline collapsed variant, and no standalone
composer on the home feed; `ComposeModal` is its only mount point, so the
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

Dropdown with two actions: "Repost" (toggle) and "Quote" (opens
`QuoteComposeModal`) — not a DaisyUI `.dropdown`/`<details>`. The menu is
portaled to `document.body` on open and positioned from the trigger's
bounding rect, so it's never clipped by an ancestor's `overflow-hidden` (e.g.
`PostItem`'s card) or trapped by a filtered ancestor's containing block (e.g.
`backdrop-blur`). Closes on outside click or `Escape` via a document-level
listener attached only while open.

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

### Auth, Primitives, Containers

`ConfirmModal` — accessible `role="dialog"` confirmation. `Field` — label +
input wrapper. `FormInput` / `FormTextarea` — apply `.form-input` /
`.form-textarea` utilities. `GlassCard` — `.glass-card` wrapper. `Loading` —
centered spinner. `ToastProvider` — toast queue context and renderer.
`PostList` / `UserList` — list containers. `QuoteEmbed` / `ReplyComposer` —
inline post context components. `ControlBar` — profile action strip.

Login/register share `AuthShell` (`eyebrow`/`heading`/`description` props +
a `children` snippet for the page's own `<form>`), a two-panel layout on
`lg+`: a `font-serif` brand panel (dot-grid texture, ember glow, forced to
the dark theme via a scoped `data-theme="dark"` regardless of the page's
active theme) beside the form card, collapsing to a single centered column
below `lg`. `AuthShell` owns only the chrome — form fields, validation, and
submission stay in each page.

## Icons

All icons from `@lucide/svelte`. Inline SVG is not used.

Icons never carry an alpha-channel color (no `text-*/NN`, including
`.muted-text`) directly or via an inherited `currentColor`, since a
translucent stroke double-blends where a lucide icon's lines cross and looks
broken. Dim an icon with the `opacity-NN` utility instead — on the icon
itself or on a wrapping element that also holds its label — since `opacity`
composites the element as one opaque group before fading it.
