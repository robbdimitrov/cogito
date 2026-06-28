# Design System

## Theme Structure

Themes are defined CSS-first in `src/app.css` using `@plugin "daisyui/theme"`.
The `data-theme` attribute on `<html>` selects the active theme. Theme
preference persists via a `theme` cookie (1-year max-age, SameSite=Lax) and
`localStorage`; the cookie is read server-side in the root `+layout.server.ts`
to set the initial `data-theme` on SSR and prevent FOUC.

### Light Theme (custom)

| Token                  | Value     |
| ---------------------- | --------- |
| `--color-base-100`     | `#f8fafc` |
| `--color-base-200`     | `#f1f5f9` |
| `--color-base-300`     | `#e2e8f0` |
| `--color-base-content` | `#0f172a` |

### Dark Theme

DaisyUI v5 built-in `dark` preset, active via `--prefersdark` (follows
`prefers-color-scheme: dark`). No custom token overrides.

### Custom Tokens (`@theme`)

| Token                  | Value                                                                   | Use                               |
| ---------------------- | ----------------------------------------------------------------------- | --------------------------------- |
| `--font-sans`          | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...` | Base body font                    |
| `--animate-pulse-slow` | `pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite`                        | Slow pulse on decorative elements |

## Custom CSS Utilities

Defined in `app.css`:

| Class                     | Definition                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `.glass-surface`          | `border-white/60 bg-base-100/80 shadow-xl backdrop-blur-2xl` (dark: `border-white/10 bg-slate-900/70 shadow-black/30`) |
| `.glass-card`             | `.glass-surface` + `card rounded-2xl`                                                                                  |
| `.glass-card-interactive` | `.glass-card` + `transition hover:bg-base-100/95` (dark: `hover:bg-slate-800/80`)                                      |
| `.form-input`             | `input min-h-12 rounded-xl bg-base-100/30 focus:border-primary/60 focus:ring-4`                                        |
| `.form-textarea`          | `textarea min-h-28 rounded-xl bg-base-100/30 focus:border-primary/60 focus:ring-4`                                     |

## Layout

| Property       | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Page container | `mx-auto max-w-5xl`                                                |
| Feed column    | `max-w-2xl`                                                        |
| Sidebar        | `18rem` — hidden below lg breakpoint                               |
| Content grid   | `grid-cols-1 sm:gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8` |
| Breakpoints    | sm=640px, lg=1024px                                                |

## Component Inventory

### `Navbar`

Fixed top navigation bar. Contains logo, primary links (home, search,
notifications), user avatar menu (profile, settings, logout), and theme toggle
(light / dark / system).

### `Avatar`

Circular image with initials fallback when no `profilePhotoKey` is set. Props:
`user`, `size` (Tailwind size classes).

### `PostItem`

Full-width `.glass-card-interactive` post card. Shows author avatar, username,
timestamp, formatted content, optional embedded image, action bar (like with
count, repost with dropdown, reply with count, delete for own posts). Renders
`QuoteEmbed` when `quotePost` is present; renders repost attribution header when
`repostOf` is present. Owner sees a delete button that triggers `ConfirmModal`.

### `UserCard`

Compact profile card (avatar, display name, username, bio excerpt,
follower/following/post counts). Used in sidebar trending and suggestions.

### `UserHeader`

Full-width profile header: cover image, or
`bg-linear-to-tr from-primary via-primary/80 to-secondary` gradient placeholder
when none is set. Below: avatar, display name, `@username`, bio, stat links
(posts, likes, following, followers), and `ControlBar` for follow or settings
access.

### `CreatePost`

Post composer with expandable textarea (`FormattedContent` preview), image
upload button (triggers `POST /uploads`), and submit. Supports `inReplyToId`
prop for reply creation.

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

`AuthHero` — hero panel on login/register (eyebrow text, title, feature bullets).
`ConfirmModal` — accessible `role="dialog"` confirmation. `Field` — label +
input wrapper. `FormInput` / `FormTextarea` — apply `.form-input` /
`.form-textarea` utilities. `GlassCard` — `.glass-card` wrapper. `IconInput` —
input with leading Lucide icon (email, lock). `Loading` — centered spinner.
`ToastProvider` — toast queue context and renderer. `PostList` / `UserList` —
list containers. `QuoteEmbed` / `ReplyComposer` — inline post context
components. `ControlBar` — profile action strip.

## Icons

All icons from `@lucide/svelte`. Inline SVG is not used.
