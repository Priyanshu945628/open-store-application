# Guide: Backend Vercel Deployment & Email OTP Activation (Resend & Mailjet)

This guide explains how to deploy the Express backend to **Vercel** and activate email verification (using **Resend** or **Mailjet**).

---

## 1. Hosting the Backend on Vercel

Since the backend is an Express application, we deploy it using Vercel's Node.js Serverless Functions capability.

### Why SQLite Works on Ephemeral Vercel Functions
Vercel serverless environments are ephemeral (their file storage resets on restarts/cold starts). However, this backend features **automatic GitHub cloud database syncing**. 
- On startup, the backend automatically **downloads** the latest database backup from your GitHub repository.
- On data writes, the backend automatically **uploads** the updated SQLite database back to your GitHub repository.
This means you get persistent database storage even on Vercel serverless functions!

### Steps to Deploy:
1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```
2. **Navigate to the Backend Directory**:
   ```bash
   cd backend
   ```
3. **Trigger the Vercel Deployment**:
   ```bash
   vercel
   ```
   Follow the CLI prompts to log in, link the project, and create the deployment.
4. **Promote to Production**:
   ```bash
   vercel --prod
   ```

---

## 2. Environment Variables Configuration

You must configure the following Environment Variables in your Vercel Dashboard under **Project Settings > Environment Variables** (or in your local `.env` file):

### Core Variables
| Variable | Description | Example / Recommendation |
| :--- | :--- | :--- |
| `CRYPTO_KEY` | Custom encryption key (minimum 32 characters) | `drytfyguhb...` |
| `GITHUB_TOKEN` | GitHub Personal Access Token (PAT) with repo write scope | `github_pat_...` |
| `GITHUB_OWNER` | Your GitHub Username / Org Name | `Priyanshu945628` |
| `GITHUB_REPO` | Storage backup repository | `Open-store-Backend` |
| `ADMIN_EMAIL` | Credentials for your Admin Panel portal | `admin@openstore.dev` |
| `ADMIN_PASSWORD`| Credentials for your Admin Panel portal | `SuperSecureAdminPassword2026!` |

### Email Service Variables (Choose Option A or B)

#### Option A: Resend API (Recommended)
Highly modern, fast setup, and has a generous free tier of 3,000 emails/month.
* `RESEND_API_KEY`: Your API key from Resend dashboard (e.g., `re_123456789...`).
* `RESEND_FROM_EMAIL`: The sender address. If you haven't verified a custom domain yet, you **must** use `Open Store <onboarding@resend.dev>` to send emails to your own registered email address. Once you verify a custom domain, you can change this to `Open Store <noreply@yourdomain.com>`.

#### Option B: Mailjet API (Alternative)
* `MAILJET_API_KEY`: Your Mailjet API public key.
* `MAILJET_SECRET_KEY`: Your Mailjet API private secret key.
* `MAILJET_FROM_EMAIL`: Your verified Mailjet sender email address (e.g., `Open Store <yourname@gmail.com>`).

---

## 3. How to Make the OTP System Active

The OTP system runs in **Mock Mode** by default. If no email environment variables are provided, verification codes are logged directly to the backend terminal. To make emails deliver to actual inboxes, configure one of the following providers:

### Setup 1: Resend (Recommended & Easiest)
1. Go to [Resend](https://resend.com) and register for a free account.
2. Navigate to **API Keys** in the sidebar and click **Create API Key**.
3. Set the key name and copy it. Add it to your environment variables as `RESEND_API_KEY`.
4. In your `.env` or Vercel config:
   ```ini
   RESEND_API_KEY=re_your_copied_api_key
   RESEND_FROM_EMAIL=Open Store <onboarding@resend.dev>
   ```
5. *Note:* When using `onboarding@resend.dev`, you can only send emails to the email address you registered your Resend account with. To send to any email address, verify a custom domain under **Domains** in the Resend dashboard and update `RESEND_FROM_EMAIL` to use your domain.

### Setup 2: Mailjet (Alternative)
1. Go to [Mailjet](https://www.mailjet.com/) and register a free account.
2. In your Account Settings, navigate to **REST API Credentials** to copy the public and secret keys.
3. In **Senders & Domains**, add your email address and click the verification link sent to that inbox to make it **Active**.
4. In your `.env` or Vercel config:
   ```ini
   MAILJET_API_KEY=your_public_key
   MAILJET_SECRET_KEY=your_secret_key
   MAILJET_FROM_EMAIL=Open Store <your_verified_sender_email@domain.com>
   ```

---

## 4. Key Limitations & Best Practices

1. **Vercel Request Size Limit (4.5MB)**:
   Vercel serverless functions enforce a strict **4.5MB request body size limit**. Directly uploading encrypted files larger than 4.5MB to the Vercel backend will trigger a `413 Payload Too Large` error.
   * **Recommendation**: For large videos or vault source code files, configure the frontend to upload in chunks, or integrate direct-to-GitHub client uploads.
2. **Cold Start Database Latency**:
   The first API request after a period of inactivity will trigger a "Cold Start". The backend will download `database.sqlite` from GitHub, which may add 1–2 seconds of latency to the first request. Subsequent requests will run in milliseconds.
