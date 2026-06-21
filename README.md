# Open Store - Re-Engineered Developer Social Workspace

Welcome to **Open Store**, a modern, high-performance developer workspace and social platform built with custom cryptography, automatic GitHub cloud sync, and secure OTP-based authentication.

---

## 🏗️ Project Architecture

The workspace is organized into three primary components:

```
[ Root Directory ]
 ├── backend/       # Express API server & SQLite database engine
 ├── frontend/      # React + Vite client application
 └── admin-panel/   # Static administrative command center
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- `npm` (Node Package Manager)

---

### 1. Backend Server Setup
The backend serves as the API gateway, handles DB operations, custom cryptography block streaming, and syncs databases with GitHub.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create/Configure your `.env` file (see [backend/.env](file:///d:/opse store/backend/.env)):
   ```env
   PORT=5000
   CRYPTO_KEY=your_secure_cryptographic_encryption_key
   
   # GitHub DB Auto-Backup Storage (Leave blank to use local storage only)
   GITHUB_TOKEN=your_github_personal_access_token
   GITHUB_OWNER=your_github_username
   GITHUB_REPO=your_backup_repository_name
   
   # Admin Portal Credentials
   ADMIN_EMAIL=admin@openstore.dev
   ADMIN_PASSWORD=SuperSecureAdminPassword2026!
   
   # Mailjet Email Service Configuration
   MAILJET_API_KEY=your_mailjet_api_key
   MAILJET_SECRET_KEY=your_mailjet_secret_key
   MAILJET_FROM_EMAIL=Open Store <noreply@api.open-store.com>
   ```
   > [!NOTE]
   > If `MAILJET_API_KEY` is omitted or left as a placeholder, the system defaults to **Mock Mode** and prints all registration/login OTP codes directly to the terminal console for easy testing.
4. Start the server:
   ```bash
   node server.js
   ```
   The backend will be running at [http://localhost:5000](http://localhost:5000).

---

### 2. Frontend React Setup
The frontend is a fully responsive React app styled with native CSS, featuring video playback, shorts streaming, stories, direct messaging, and secure verification flows.

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   The frontend will be running at [http://localhost:5173](http://localhost:5173).

---

### 3. Admin Command Panel Setup
The admin panel is a secure static interface served directly by the backend at:
👉 **[http://localhost:5000/admin/](http://localhost:5000/admin/)**

Alternatively, you can serve it locally using any static web server (such as Python):
```bash
cd ../admin-panel
python -m http.server 8000
```
Then visit [http://localhost:8000](http://localhost:8000). The panel will automatically point its API requests to the backend at port 5000.

---

## 🔒 Key Security Features

### 📨 Mailjet OTP Authentication
- New registrations require a valid email address.
- Domain checks prevent signups from temporary or untrusted email hosts. Only reputable domains (like `gmail.com`, `yahoo.com`, `outlook.com`, etc.) are allowed.
- Verification codes are sent using **Mailjet API v3.1** (or printed to the terminal console in Mock Mode).

### 🔑 Forgot & Reset Password
- Users can trigger a secure password reset request using their username or email.
- Sends a verification code to their registered email address to execute a password reset.

### 💾 Automatic Database Backup
- Local writes trigger an asynchronous backup handler that pushes the `database.sqlite` file directly to a designated private GitHub repository.
- Upon starting up, the backend automatically pulls the latest backed-up database state, ensuring no data is lost across restarts.
