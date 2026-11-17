# Offline record collection

Open the website online, sign in, and wait for **Offline loading ready on this phone**. Wait for your electoral areas and polling stations to appear. Stay signed in to reopen the app offline. First sign-in and password resets require internet.

Offline users can view previously loaded data and add assistance records for their cached polling stations. Each record is saved to the phone before the form clears. The connection panel and records table show pending entries. Reopen the same app with the same browser and account to access them.

Pending records sync automatically on reconnection, app visibility, or every 30 seconds while the app is open. **Sync now** retries immediately. Closing the app retains pending entries but pauses syncing. An account change, station removal, reset, denied permission, or conflicting duplicate keeps an entry on the phone with an error; contact admin to resolve it. Never clear browser data or uninstall before syncing. Device storage can be cleared by the browser or device, so sync regularly.

Reports, backups, restore, reset, station administration, account changes, and logo changes require internet. Reports require the current account's outbox to be empty. Server backups exclude records that have not synced yet. Other devices may also have unsynced entries; pause collection and have all agents sync before a reset or final report.

Offline access uses the last cached profile and data. Updated permissions are enforced by Firebase when syncing. Use a secured personal device: cached data remains on the device between sessions. The app's service worker caches application files and Firebase SDK code only, never Firebase API responses. Firestore's persistent local cache stores previously loaded database documents. Outbox entries are stored individually in browser storage and scoped to the account UID.

The duplicate-check transaction runs on the server before each queued record is created. It never overwrites an existing record. The server timestamp is the time of sync; the pending entry displays the time collected on the phone.

Checks: `node tests/unit.cjs` and `node tests/service-worker.cjs`. These use mocked Firebase/storage and service-worker APIs; live Firebase/Android validation is still required.
