# Account integration handoff

## Current preview

`account.js` owns account creation, username/password sign-in, tab-session restoration, sign-out, and workspace storage. `app.js` owns the forms and the signed-in view. No Supabase connection or email sending is configured yet.

- Sign-up: username, email, password. Usernames are case-insensitive and unique on this device. Emails are also unique locally.
- Passwords: salted PBKDF2-SHA-256 verifiers, 210,000 iterations, with a fresh random salt per account. Plain passwords are never persisted or logged.
- Session: user ID in sessionStorage. Reloads stay signed in; closing the tab ends the normal tab session.
- Workspace: the existing project/profile/activity structure, under `pd-workspace-v1:<user-id>` in localStorage.
- Previous unscoped workspace: can be copied into the first importing account by a visible sign-up checkbox. The original is preserved. A claim marker prevents copying it into another account.

This is a frontend gate, not production authentication. Browser storage and client-side code can be inspected or modified by the device user. Data is neither remotely backed up nor protected from someone with access to the same browser. Preview accounts are specific to the website origin: localhost and a hosted site have different accounts and data.

## Provider surface

The public user shape is `{ id, username, email, emailVerified }`.

| Method | Input | Result |
| --- | --- | --- |
| `signUp` | `{ username, email, password, importWorkspace }` | Promise of `{ user, imported }` |
| `signIn` | `{ username, password }` | Promise of `{ user }` |
| `getSession` | none | user or null |
| `signOut` | none | clears session |
| `loadWorkspace` | user | workspace object |
| `saveWorkspace` | user, workspace | persists or throws |

## Supabase implementation phase

1. Replace local registration and password verification with Supabase Auth. Keep passwords entirely within the authentication flow; never place them in profile or project records.
2. Store a unique normalized username in a profile row whose ID matches the authenticated user ID. Enforce uniqueness in the database, not just the form.
3. Preserve username-only sign-in using a protected server endpoint that resolves the username and performs the authentication flow without returning an account's email address to unauthenticated clients. Apply rate limiting and generic failure responses there.
4. Make session restoration and workspace loading/saving asynchronous, and update their callers in `app.js` to await completion with loading and error states. The current synchronous local storage methods are not a completed drop-in Supabase implementation.
5. Enforce ownership and visibility using database row-level security for profiles, projects, memberships, and requests/invitations. Client-side `mine` flags are UI hints, not authorization.
6. Store cover files in object storage and save their authorized object references in project records. Replace local data URLs after successful upload.
7. Add an explicit migration step for local preview workspaces after a real account is authenticated. Do not silently publish private portfolio or project data. Local password hashes must not be copied into production accounts; users must establish real credentials through the authentication flow.
8. When email verification is enabled, add verification-required, resend, callback, and recovery screens. The present `emailVerified:false` is truthful preview metadata, not a bypass for production.

No production credentials, service-role keys, or fabricated Supabase project settings are included.
