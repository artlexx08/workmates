# WorkMate - Smart Carpenter & Workshop Management Suite

WorkMate is a premium, mobile-responsive web application designed for carpenter, workshop, and construction managers. It facilitates multi-site tracking, worker profiles (with photos), attendance logging, salary advances, automated payroll calculations, and professional PDF payroll report receipts.

Built with a dark wood-accented visual theme, glassmorphic cards, and smooth Framer Motion transitions, it syncs in real-time across multiple devices using Firebase Realtime Database.

---

## Folder Structure

```
workmate/
├── public/                 # Static assets (logos, illustrations)
├── src/
│   ├── app/                # Next.js App Router folders
│   │   ├── layout.js       # Root page wrapper with AuthContext
│   │   ├── page.js         # Root redirect controller (Auth checker)
│   │   ├── login/          # Secure sign-in page
│   │   ├── signup/         # Account registration page (sets company profiles)
│   │   ├── forgot/         # Password recovery page
│   │   └── dashboard/      # Protected dashboard area
│   │       ├── layout.js   # Master layout (includes navigation drawer guards)
│   │       ├── page.js     # Home dashboard (metrics, SVGs, distribution meters)
│   │       ├── sites/      # Multi-site CRUD panel
│   │       ├── workers/    # Workers directory with photos
│   │       ├── attendance/ # Single-click date attendance tracker
│   │       ├── advance/    # Advances log and worker transaction ledger
│   │       ├── salary/     # Site-by-site salary payroll ledger
│   │       └── reports/    # PDF report previewer & builder
│   ├── components/         # Reusable dashboard components
│   │   ├── Sidebar.js      # Mobile-responsive slide-out navigation
│   │   └── Topbar.js       # Status indicators and calendar bar
│   ├── context/
│   │   └── AuthContext.js  # React Hook Context managing session states
│   └── lib/
│       ├── firebase.js     # Firebase SDK connection & Simulation Mode check
│       └── db.js           # Realtime DB CRUD, calculations, and listeners
├── database.rules.json     # Firebase Realtime Database security configuration
├── storage.rules           # Firebase Storage access security configuration
├── firebase.json           # Firebase Hosting configuration for static exports
├── .env.local.example      # Environment variables template
├── package.json            # NPM dependencies list
└── README.md               # This documentation guide
```

---

## Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 2. Installation
Open your terminal inside the project workspace directory and run:
```bash
# Install dependencies
npm install
```

### 3. Run Locally (Simulation Mode)
Out-of-the-box, WorkMate features a robust **LocalStorage Simulation Mode** which executes all database updates, attendance toggles, and PDF generation immediately using the browser’s storage. You can test all features without setting up Firebase.
```bash
# Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Connecting Firebase Cloud Backend

To enable real-time multi-device cloud synchronization, follow these steps to connect your Firebase account:

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and name it `WorkMate`.
3. Enable or disable Google Analytics (optional) and click **Create Project**.

### 2. Set Up Firebase Authentication
1. In the left menu under Build, click **Authentication**.
2. Click **Get Started**.
3. Choose the **Email/Password** sign-in provider, enable it, and click **Save**.

### 3. Set Up Realtime Database
1. Under Build, click **Realtime Database** and click **Create Database**.
2. Select your database location and click **Next**.
3. Choose **Start in test mode** (we will override these rules shortly) and click **Enable**.

### 4. Set Up Firebase Storage
1. Under Build, click **Storage** and click **Get Started**.
2. Click **Next** and choose your bucket location, then click **Done**.

### 5. Configure Web App Credentials
1. On the Firebase Project Overview page, click the **Web icon (</>)** to register an app.
2. Name the app `WorkMate Web` and click **Register App**.
3. Copy the `firebaseConfig` object keys.
4. In the root of your project directory, create a file named `.env.local` (copying `.env.local.example`) and fill in the values:
   ```env
   
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA9eAHiK9gY16YsD3Vwl1Yxk_cbN5_8XDU
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=workmate-5879d.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://workmate-5879d-default-rtdb.asia-southeast1.firebasedatabase.app
NEXT_PUBLIC_FIREBASE_PROJECT_ID=workmate-5879d
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=workmate-5879d.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=293083876937
NEXT_PUBLIC_FIREBASE_APP_ID=1:293083876937:web:408765d71e0138ce857998
   ```
5. Restart your local server (`npm run dev`). The status badge in the top right will change from **Simulation Mode** to **Firebase Sync**.

---

## Developer Guide: Code Mechanisms

### 1. CRUD Operations
Database operations are encapsulated in `src/lib/db.js`.
- **Create/Update**: Handled using `set` and `update` methods. When registering a worker or site, we write to `users/${uid}/workers/${workerId}`.
- **Deduction Calculations**: Inside `syncSalaryAndDashboard`, the client reads all records, calculates attendance ratios, subtracts advances, and performs bulk database updates (`update(ref(database), updates)`) to keep database views optimized and synchronized.

### 2. Real-Time Listeners (`onValue()`)
Rather than pulling data through polling API requests, WorkMate uses Firebase's real-time sockets.
We establish active streams using `onValue` in `src/lib/db.js`:
```javascript
import { ref, onValue, off } from 'firebase/database';

export const listenData = (userId, subPath, callback) => {
  const dbRef = ref(database, `users/${userId}/${subPath}`);
  const listener = onValue(dbRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
  return () => off(dbRef, 'value', listener); // Returns an unsubscribe cleanup hook
};
```
When any client updates a record (e.g. marking attendance), Firebase pushes the updated snapshot down the socket channel. The UI updates instantly across all connected screens.

---

## Production Deployment to Firebase Hosting

To deploy your WorkMate application to production, use these commands:

### 1. Install Firebase CLI globally
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase in the Project Directory
```bash
firebase init
```
1. Select **Hosting: Configure files for Firebase Hosting...** (use Spacebar to select, Enter to confirm).
2. Choose **Use an existing project** and select your project name.
3. For public directory, type `out` (matching our Next.js static build configuration).
4. Configure as a single-page app? Type **Yes**.
5. Set up automatic builds and deploys with GitHub? Type **No**.
6. Overwrite `out/index.html`? Type **No**.

*Note: This will overwrite or verify `firebase.json` and create `.firebaserc`.*

### 4. Deploy Database Rules & Storage Rules
1. Apply the database security rules:
   ```bash
   firebase deploy --only database
   ```
2. Apply the storage security rules:
   ```bash
   firebase deploy --only storage
   ```

### 5. Build and Deploy the Web App
Execute the compilation script to output the static code to `out/` and deploy:
```bash
# Build the Next.js static export
npm run build

# Deploy assets to Hosting
firebase deploy --only hosting
```
Once deployed, Firebase will output a public hosting URL (e.g. `https://workmate-xxxx.web.app`) which you can open on any mobile phone or computer!
