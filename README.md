# Perception Den

A standalone, responsive frontend for project makers and creative collaborators. Uses a standalone Perception Den preview account; no ChatGPT account is required.

## Preview

Serve this directory with any static HTTP server. For example, from this directory run `python -m http.server 4173`, then visit http://localhost:4173. No build or dependency installation is needed.

## Try the account flow

Open the site, choose Create account, and enter a username, email, and test password. Sign in later with username and password. Email verification is planned; no email is sent. Accounts and their workspaces are saved on this device only. The optional sign-up checkbox brings existing local projects into the first importing account. Use Sign out in the app header to test another account.

## Included

- Large project covers, a dark studio theme, soft blue accents, and bottom navigation.
- Project search, category filters, creative role filters, and saved projects.
- Creative discovery and illustrative portfolios.
- My Projects in the portfolio, with project creation, editing, and confirmed deletion.
- One project record shared across portfolio and discovery; edits preserve collaborators and media.
- Current collaborator credits with roles and optional portfolio links.
- Work in progress gallery: images, videos, references, notes, and collaborator tags, added by URL.
- Direct MP4/WebM/OGV video playback; external video pages open at their source.
- Profile editing with a searchable, multi-select role bubble menu using every discovery role.
- Profile and project social media links, plus a primary external messaging destination.
- Whole-card project navigation and Edit preview controls.
- Drag-and-drop or file-picker cover images (JPG, PNG, WebP, 10 MB input limit), resized and saved locally.
- Portfolio links.
- Join-request and project-invitation drafts with duplicate prevention and removal.
- Browser-local persistence. Sample community records are fictional.

## Backend boundary

This is a working frontend prototype. It does not send invitations, provide production authentication, synchronize devices, upload files to a server, or expose the previous app's private records. Browser storage can be cleared and must not hold sensitive data. Real accounts, project ownership, server validation, moderation, media storage, and request/invitation delivery belong to the next backend phase. The original app's authenticated APIs remain in the parent workspace for migration reference.

## Hosting

The frontend files (`index.html`, `style.css`, `app.js`, `account.js`, and `covers/`) can be served by GitHub Pages or any static host. GitHub repository storage by itself does not publish a live site. In GitHub repository Settings → Pages, choose Deploy from a branch, `main`, `/ (root)` after this frontend has been copied to the repository root.

Sample project covers are original bundled SVG illustrations. The app uses system font fallbacks and requires no external assets. They illustrate fictional projects and are not portfolio credits.

The previous app source remains preserved in the original local workspace for backend migration. It is not included in this frontend repository.


## Messaging and cover storage

Conversations happen on the external destination configured under Primary Messaging. Perception Den keeps request and invitation drafts only. Social links do not connect or authenticate social accounts. Covers selected from the device are decoded, resized to at most 1600 pixels, and stored as JPEG data in browser storage. A failed storage write keeps the previous project intact. Selecting a cover does not upload it to a server. Project work media still uses URLs.

## Backend readiness

See [ACCOUNT_INTEGRATION.md](ACCOUNT_INTEGRATION.md) for the preview provider contract, account data ownership, and the remaining Supabase implementation work.
