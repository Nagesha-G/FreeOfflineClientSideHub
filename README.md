# Offline Client Hub

A free, local-first client reporting workspace for freelancers, agencies and indie makers.

## What works without Google or a server

- Project creation, editing and deletion
- Milestones with progress, status and due dates
- Automatic project progress
- Weekly client updates
- Completed / in-progress / blockers / next-week plan
- Deliverables and delivery status
- Persistent blockers and next steps
- Screenshot/image proof stored locally
- External proof links
- Client-facing read-only-style report view
- Browser Print → Save as PDF
- JSON backup/import
- CSV report export
- Responsive mobile/desktop UI
- PWA service worker for offline app shell
- Optional support/contribution link
- Local IndexedDB storage
- No required login
- No required API key
- No required backend

## Important privacy detail

Core data is stored in the browser's IndexedDB. If you later connect a cloud integration, data can leave the device according to the integration's permissions. The Google integration should be built separately with OAuth and narrow permissions.

## PDF

Use **Client View → PDF / Print** or **Project workspace → PDF / Print**, then choose **Save as PDF** in the browser print dialog. This keeps the core app dependency-free.

## Support

The app is intended to remain useful for free. If it saves time, the author can optionally add a personal support/payment URL per project. Suggested voluntary amounts are small, such as ₹49, ₹99 or ₹199. The app itself does not process payment information.

## Run on Windows

Recommended:
1. Open this folder in VS Code.
2. Use a local web server (for example VS Code Live Server) because service workers/PWA features need HTTP/HTTPS.
3. Open the local address.
4. Create a project.

For the simplest test, opening `index.html` directly also works for most core features, but PWA/service-worker installation requires localhost/HTTPS.

## Roadmap after this offline release

1. Google Drive OAuth backup/sync
2. Google Calendar milestone integration
3. Google Docs report generation
4. GitHub activity integration
5. Optional cloud live sharing

The offline core should remain usable independently of those integrations.


## Optional micro-support model

ClientFlow does not require payment.

The optional support amounts are:
- ₹9
- ₹19
- ₹29

The project owner can upload their own UPI/payment QR from **Profile → Support setup**.
The QR is stored locally in the browser and shown only when the user opens the optional
Support panel. Selecting ₹9/₹19/₹29 is only a suggested contribution amount; the external
payment app/provider handles the actual transaction.

There is no support URL inside project creation anymore. Support is a product-level setting,
not a project requirement.

The product remains usable with ₹0 contribution.

### India
- ₹10
- ₹25
- ₹49

### International
- $0.50
- $1
- $2

The application does not process payments or store payment information. The owner supplies
a payment/support URL, and the external payment provider handles checkout.

The support amount is optional. A user can use the complete offline core without paying anything.

This is a support model, not a requirement to unlock software features.


## ClientFlow v3 product layer

Additional UX features:
- ClientFlow branding and custom logo mark
- Nagesha G attribution/footer
- Responsive dashboard redesign
- Dark/light theme stored locally
- Local profile/account section with optional profile photo
- Dedicated client report screen
- Back to dashboard from the report screen
- Save/Print PDF action from the report screen
- Project health indicator
- Three.js decorative visual layer
- India-only optional support amounts: ₹9 / ₹19 / ₹29
- Support remains optional; all core features remain free

### Three.js note

The visual layer loads Three.js from a CDN when internet access is available. The application core remains local-first, but this particular visual dependency should be vendored locally if you require a completely network-independent visual layer. The PWA shell can then cache the local Three.js file.
