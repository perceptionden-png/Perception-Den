# Perception Den

A standalone, responsive frontend for project makers and creative collaborators. Open access: no ChatGPT account or platform session is required.

## Preview

Serve this directory with any static HTTP server. For example, from this directory run `python -m http.server 4173`, then visit http://localhost:4173. No build or dependency installation is needed.

## Included

- Large project covers, a dark studio theme, soft blue accents, and bottom navigation.
- Project search, category filters, creative role filters, and saved projects.
- Creative discovery and illustrative portfolios.
- My Projects in the portfolio, with project creation, editing, and confirmed deletion.
- One project record shared across portfolio and discovery; edits preserve collaborators and media.
- Current collaborator credits with roles and optional portfolio links.
- Work in progress gallery: images, videos, references, notes, and collaborator tags, added by URL.
- Direct MP4/WebM/OGV video playback; external video pages open at their source.
- Profile editing and portfolio links.
- Join-request and project-invitation drafts with duplicate prevention and removal.
- Browser-local persistence. Sample community records are fictional.

## Backend boundary

This is a working frontend prototype. It does not send invitations, authenticate users, synchronize devices, upload files, or expose the previous app's private records. Browser storage can be cleared and must not hold sensitive data. Real accounts, project ownership, server validation, moderation, media storage, and request/invitation delivery belong to the next backend phase. The original app's authenticated APIs remain in the parent workspace for migration reference.

## Hosting

The frontend files (`index.html`, `style.css`, `app.js`, and `covers/`) can be served by GitHub Pages or any static host. GitHub repository storage by itself does not publish a live site. In GitHub repository Settings → Pages, choose Deploy from a branch, `main`, `/ (root)` after this frontend has been copied to the repository root.

Sample project covers are original bundled SVG illustrations. The app uses system font fallbacks and requires no external assets. They illustrate fictional projects and are not portfolio credits.

The previous app source remains preserved in the original local workspace for backend migration. It is not included in this frontend repository.

