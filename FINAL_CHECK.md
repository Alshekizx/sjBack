# Admin website final check

Checked locally on 24 September 2026.

## Fixed

- Course and case lists now update only after a successful save. Failed requests keep the editor open and show the error inside the dialog.
- Required course, case, notification, and administrator-record fields have basic validation. Long dialogs scroll on small screens.
- Login recovers from rejected network requests; session loading no longer leaves an unhandled rejection.
- Payment records resolve student names from student profiles and use the actual payment/creation date. Search no longer assumes a nonexistent name field.
- Analytics uses the current six calendar months, separates years, ignores failed payments, counts all courses, and removes fabricated popularity/subscription figures. Dashboard monthly revenue now counts the current month.
- Removed header controls that had no implementation; the notifications button opens the notification manager.
- Media load/delete errors are shown instead of silently presenting success.
- Administrator records are explicitly described as records, not sign-in accounts. Fixed conditional hook ordering on this screen.
- Removed the notification scheduling option because no scheduling workflow exists.
- Support tickets read/write the relational support_tickets table used by the student application and show the submitted message. “Start work” describes the status action accurately.
- Both server entrypoints require authentication and an administrator role for payment lookup, use the real payments table, and restrict administrator records to super administrators.
- Corrected a malformed inline TypeScript type left by the formatter in CollectionManager.

## Validation

- TypeScript: npx tsc --noEmit — passed.
- Production build: npm run build — passed; nonblocking bundle-size warning remains (main JS approximately 534 kB).
- node --test tests/*.test.mjs — 9 tests passed. Tests cover analytics date boundaries and payment/admin-record route checks with mocked server dependencies.

## Remaining limits before production sign-off

- No authenticated browser or live database/storage write tests were performed. Backend changes are local and have not been deployed. Test login, saving/publishing, file upload/deletion, notifications, support updates, and sign-out against the deployed environment.
- Administrator records still do not provision authentication accounts or change sign-in roles. Use the existing Supabase administrator provisioning workflow.
- Existing support tickets stored in the legacy admin KV collection are not automatically migrated into the relational table.
- Student activity still uses the admin KV collection rather than aggregating actual lesson progress and practice attempts.
- Mock exams currently edit exam details but do not assign questions. Website Pages edits page metadata, not page body content.
- Database policies and generic collection routes still broadly trust recognized administrator roles. The added endpoint checks are not a complete role-permission security audit.

These findings prevent a claim that every production workflow is fully verified.
