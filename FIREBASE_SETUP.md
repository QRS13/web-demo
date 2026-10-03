# Firebase email verification setup

Real account creation and Gmail verification require an FDC-owned Firebase project. The website does not send or verify email until that project is configured.

1. Create a Firebase project and register a Web app.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. Copy the Web app's `apiKey`, `authDomain`, `projectId`, and `appId` into `firebase-config.js`. These web configuration values are public; never put service-account credentials or private keys in browser files.
4. In **Authentication → Settings → Authorized domains**, authorize the website's domain. For local testing, use a local HTTP server at `localhost`; `file://` is not a supported production origin. Deploy the site over HTTPS.
5. Configure Firebase Authentication email templates and test account creation, the verification link, resend, and sign-out.

The current request list is still demo-only and is not saved to Firebase. Do not use it to store customer or device data until a secured backend and database access rules are implemented.
