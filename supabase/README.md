# Supabase collaboration starter

This adds backend-ready source files. It does not activate Supabase in the current app and has not been run against your database.

## 1. Create the database tables

1. Open your project at https://supabase.com/dashboard.
2. Choose **SQL Editor**, then create a new query.
3. Copy all of `schema.sql`, paste it into the editor, and click **Run**.
4. Check **Table Editor** for `profiles`, `projects`, and `collaboration_requests`.

Use a fresh schema. If you already ran the earlier `public.users`/`applicant_id` example, do not paste this script over it or delete your data. That schema needs a migration to the new profile and sender/receiver model. This script runs in a transaction and fails on conflicting tables rather than silently altering them.

Supabase Auth stores emails and passwords. A database trigger creates profiles on signup, even if email verification is enabled. All profile fields in this starter are visible to signed-in members. Request messages are visible only to their sender and recipient.

## 2. Configure the browser client

In the Supabase dashboard's **Connect** panel, get the project URL and publishable key. Only a publishable key (or legacy anon key) belongs in frontend code, never a secret/service-role key.

Use a browser ES module, and create one shared client:

```js
import { connectSupabase } from './supabase/client.js';

const api = connectSupabase({
  url: 'https://YOUR_PROJECT.supabase.co',
  publishableKey: 'YOUR_PUBLISHABLE_KEY'
});

const {
  supabase, signUpUser, loginUser, createProject,
  sendCollabRequest, fetchMyRequests, respondToRequest
} = api;
```

`client.js` loads the v2 Supabase web client via an ESM CDN. For a production bundled app, install and pin `@supabase/supabase-js` with a lockfile instead.

## 3. Call the functions

These snippets show separate user actions; do not run them all automatically on page load.

```js
const signup = await signUpUser({
  email: emailInput.value,
  password: passwordInput.value,
  fullName: nameInput.value,
  role: 'Director',
  skills: ['Directing', 'Editing']
});
if (signup.verificationRequired) {
  // Show: Check your email to confirm your account.
  // Do not enter the authenticated app until a session exists.
}

await loginUser({ email: emailInput.value, password: passwordInput.value });

const project = await createProject({
  title: 'After the Quiet',
  description: 'A short film looking for a composer and editor.'
});

// A collaborator applying: receiver is automatically the project creator.
await sendCollabRequest({
  projectId: selectedProject.id,
  message: 'I would love to compose the score.'
});

// A creator inviting: receiver is a real profiles.id selected in the UI.
await sendCollabRequest({
  projectId: myProject.id,
  receiverId: selectedCollaborator.id,
  message: 'Would you like to join our film as editor?'
});

const inbox = await fetchMyRequests({ status: 'pending' });

await respondToRequest({ requestId: selectedRequest.id, status: 'accepted' });
// Or status: 'rejected'. Only the recipient can respond, once.

await supabase.auth.signOut();
```

Catch thrown errors and display them in the relevant form. Render messages and profile names using textContent or escaped HTML. Requests are paginated: call fetchMyRequests with limit and offset to load more.

## Login difference from the current preview

The existing prototype uses local username/password accounts. These real Supabase functions use **email and password**. Username-only Supabase login needs a separate protected server endpoint and a unique username field; it is not implemented here. Do not expose users' emails through a public username lookup. The current username preview is unchanged until we wire this starter into it.

## Next integration work

- Replace local account calls and the browser-only workspace adapter in `account.js`/`app.js` with asynchronous Supabase calls and session-state handling.
- Connect the existing request/invite buttons to these functions and real profile/project IDs. Fictional demo IDs cannot be sent to the database.
- Test two real accounts: A creates a project; B applies; A accepts. A invites B; B rejects. Verify that B cannot decide their own application and that unrelated C cannot read either message.
- Accepting a request currently changes its status only. Memberships, file access, notifications, roles needed, social links, portfolios, and media storage require additional fields/tables and policies in the next migration. No invitation emails or chats are sent by this starter.
- Existing local password hashes cannot become Supabase credentials. Local data needs an explicit account-linked import.

References: https://supabase.com/docs/reference/javascript/auth-signup · https://supabase.com/docs/reference/javascript/auth-signinwithpassword · https://supabase.com/docs/guides/database/postgres/row-level-security · https://supabase.com/docs/guides/database/postgres/column-level-security
