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
| `.glass-surface`          | `border-white/60 bg-base-100/80 shadow-xl backdrop-blur-2xl` (dark: `border-white/15 bg-base-200/85 shadow-black/40`)  |
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

Fixed top navigation bar. Wordmark: `font-serif` + restrained
`from-primary to-primary/70` gradient. Icon-only throughout (no text labels,
no breakpoint-dependent sizing) so the bar never crowds the centered
wordmark and behaves identically at every width; `aria-label`/`title` carry
the names. Links split by role, not all on one side: `navbar-start` holds
wayfinding (home, search) in a shared pill; `navbar-end` holds
personal/account items (notifications, user menu) in their own pill next to
the avatar, balancing the bar 2-and-2. Both pills reuse `ControlBar`'s
active-tab fill (`bg-primary`) to mark the current route. User menu (avatar
+ chevron) opens profile/settings/logout; theme control lives in Settings,
gated to authenticated users.

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
(posts, likes, following, followers), and `ControlBar` for follow or settings
access.

### `CreatePost`

Progressive-disclosure composer: collapses to a single-line `font-serif`
prompt pill, expanding on focus/click to the full textarea
(`FormattedContent` preview), image upload button (triggers
`POST /uploads`), and submit. Collapses back after a successful post or on
blur while empty; the `focusout` handler defers its `document.activeElement`
check (rather than trusting `relatedTarget`, which is unset when the expand
button itself gets unmounted mid-click) so it doesn't collapse mid-click on
its own controls. Supports `inReplyToId` prop for reply creation.

### `FormattedContent`

Inline renderer that linkifies `#hashtag` tokens within post text. Hashtags
render as navigation links to `/hashtags/{tag}`.

### `RepostMenu`

Dropdown (DaisyUI dropdown) with two actions: "Repost" (toggle) and "Quote"
(opens `QuoteComposeModal`).

### `QuoteComposeModal`

Full-screen modal containing a `CreatePost` composer pre-set with `quoteOfId`;
includes an embedded `QuoteEmbed` preview of the source post.

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
