# Duty Scheduling Information System with Reporting

This guide explains, from zero experience, how to set up and run the project on your computer.

Project stack:
- Backend: Node.js + Express + TypeScript + MySQL + Prisma
- Frontend: React + TypeScript + Leaflet (OpenStreetMap)
- Auth: Email/password + Google OAuth (optional, but supported)

---

## 1. Prerequisites (install required tools)

You need the following tools installed on Windows:

### 1) Git
Download: https://git-scm.com/downloads  
Install:
1. Open the installer you downloaded
2. Accept defaults (recommended)
3. Finish installation

Check installation (PowerShell):
```powershell
git --version
```
You should see a version number like `git version 2.xx.x`.

---

### 2) Node.js (includes npm)
Recommended version: **Node.js 20 LTS**  
Download: https://nodejs.org/en/download  

Install:
1. Download the Windows installer for Node.js 20 LTS
2. Install with default options

Check installation:
```powershell
node -v
npm -v
```
You should see version numbers.

---

### 3) MySQL Server (because this project uses MySQL)
Download: https://dev.mysql.com/downloads/mysql/  
Recommended: **MySQL Community Server 8.0**

Install:
1. Download MySQL Community Server
2. Install and create a MySQL root password (you will need it)
3. Start the MySQL service after installation (the installer usually offers this)

Check installation (PowerShell):
```powershell
mysql --version
```
If `mysql` is not recognized, you may need to restart PowerShell or ensure MySQL is added to PATH during installation.

---

### 4) A database client is optional
You do not need GUI tools, because the project can run migrations automatically.  
But it can help for debugging.

---

## 2. Download the project

### Option A: Clone with Git (recommended)
1. Open PowerShell
2. Go to a folder where you want to store the project (example: Desktop)

```powershell
cd $HOME\Desktop
```

3. Clone the repository:
```powershell
git clone https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
cd <YOUR_REPO>
```

Replace `https://github.com/...` and `<YOUR_REPO>` with your real repository URL/name.

### Option B: Download ZIP
1. Open the repository page on GitHub
2. Click **Code** → **Download ZIP**
3. Unzip the file to a folder
4. Open that folder in PowerShell

---

## 3. Environment variables (.env)

The project uses two `.env` files:
- `backend/.env` (required)
- `frontend/.env` (optional, defaults exist)

### Step 1: Create backend env file
In `backend/` you already have `backend/.env.example`.

Copy it:
1. Open File Explorer
2. Go to `backend/`
3. Copy `backend/.env.example`
4. Rename the copy to `backend/.env`

Or in PowerShell (optional):
```powershell
cd "C:\Users\nomet\Desktop\exam_project\backend"
copy .env.example .env
```

### Step 2: Fill in backend variables
Open `backend/.env` in a text editor and set values.

Variables (all are written in `backend/.env.example`):
```env
DB_URL=mysql://user:password@host:3306/dbname
JWT_SECRET=change-me-to-a-long-random-secret
FRONTEND_URL=http://localhost:5173
PORT=4000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
GOOGLE_CALENDAR_ID=primary
GOOGLE_SHEETS_ID=
GOOGLE_SHEETS_RANGE=Observations!A:C
GOOGLE_DOCS_FOLDER_ID=
```

Beginner tips:
- `DB_URL`: use your MySQL username/password and the database name.
  - Example for local MySQL root:
    ```env
    DB_URL=mysql://root:YOUR_PASSWORD@localhost:3306/exam_project
    ```
- `JWT_SECRET`: make it a long random string (at least ~16 characters).
- Google variables are optional. If you leave them empty, the Google login/calendar features will not work (the app will still run).

---

## 4. Database setup (MySQL + Prisma)

### Recommended: use the project setup script
This project includes a script that:
- ensures `.env` exists
- creates/updates the database
- runs Prisma migrations
- runs the seed script (creates default `manager` account)

In PowerShell:
```powershell
cd "C:\Users\nomet\Desktop\exam_project\backend"
npm install
npm run setup
```

What you should see:
- Prisma client generation
- Prisma migration output
- Seed output

If MySQL permissions are not sufficient, the script may ask you to enter the MySQL password in the console.

### Manual (alternative) commands
If you prefer doing it manually (not required if `npm run setup` works):

1) Create DB (optional, depending on your MySQL permissions)
2) Run Prisma migrations:
```powershell
npx prisma migrate dev --schema prisma/schema.prisma
```

3) Run seed:
```powershell
npx prisma db seed --schema prisma/schema.prisma
```

---

## 5. Run backend

Step-by-step:
```powershell
cd "C:\Users\nomet\Desktop\exam_project\backend"
npm install
npm run dev
```

What should appear in the console:
- Something like:
  - `Backend listening on http://localhost:4000`

If you see an error about environment variables or MySQL connection, go back to section 3 and 4.

Keep this terminal window open.

---

## 6. Run frontend

Step-by-step:
```powershell
cd "C:\Users\nomet\Desktop\exam_project\frontend"
npm install
npm run dev
```

What should appear:
- A URL like `http://localhost:5173`

Open in your browser:
```text
http://localhost:5173
```

Keep the frontend running in this terminal window.

---

## 7. Login (and role approval)

### Default manager account
After the seed, the system creates a default manager user:
- `login/email`: `manager`
- `password`: `12345`

On the login page, enter:
- Login field: `manager`
- Password: `12345`

### Register a new user (becomes “unregistered” / pending)
1. Open the site in your browser
2. Go to **Register**
3. Enter:
   - Email
   - Password
   - (optional) Name
4. Submit

After registering:
- the user has **no role** yet
- manager must approve them

### Manager approves the user
1. Login as manager (`manager` / `12345`)
2. Open:
   - **/manager/pending**
3. Find the user in the pending list
4. Note the shown **ID** (you will need it later)
5. Click **Confirm as employee**

Now that user becomes `employee` role (approved).

---

## 8. Optional: Google integrations (high score)

This project supports Google OAuth for login.
It can also optionally create Google Calendar events for duties (only if the employee connected Google).

### Step 1: Create a Google Cloud project
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create a new project

### Step 2: Enable APIs
Enable:
- Google OAuth 2.0 (OAuth consent screen / credentials)
- Google Calendar API
- Google Docs/Sheets are not required for core reporting in this refactor (they may exist in env template, but the reporting logic uses duty results).

### Step 3: Configure OAuth consent screen
1. Go to **OAuth consent screen**
2. Set required fields (application name, email, etc.)

### Step 4: Create OAuth Client ID
1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth Client ID**
3. Choose application type: **Web application**
4. Add redirect URI:
   - `http://localhost:4000/api/auth/google/callback`

### Step 5: Put credentials into `backend/.env`
Set:
```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
GOOGLE_CALENDAR_ID=primary
```

Restart backend after editing env:
1. Stop backend (Ctrl+C)
2. Start again:
```powershell
cd "C:\Users\nomet\Desktop\exam_project\backend"
npm run dev
```

---

## 9. Testing the full system (end-to-end flow)

Follow this checklist in order:

### 1) Register user (future employee)
1. Go to **Register**
2. Register with an email and password

### 2) Approve as manager
1. Login as manager (`manager` / `12345`)
2. Open **/manager/pending**
3. Find your new user and **note its `ID`**
4. Click **Confirm as employee**

### 3) Manager creates zones (polygon)
1. Login as manager
2. Go to **/zones**
3. Draw a polygon on the map:
   - click multiple points to create a polygon (minimum 3 points)
4. Enter zone name
5. Click **Save zone**

### 4) Manager assigns duty
1. Login as manager
2. Open **/duties**
3. Choose:
   - Zone
   - Employee ID (**use the ID you noted during approval**)
   - Date
   - Start time and end time
4. Click **Create duty**

### 5) Employee submits duty results (5-minute interval records)
1. Login as the approved employee
2. Open **/duty-results**
3. Choose the duty from the dropdown
4. Enter:
   - `trafficLightId` (any positive integer, example: 1)
   - `startTime` (must be inside the duty interval and represent a 5-minute interval)
   - `greenWithCars`, `greenWithoutCars`, `redWithCars`, `redWithoutCars`
5. Click **Save interval**

Tip:
- Use times like `10:00`, `10:05`, `10:10`, etc. to stay aligned to 5-minute intervals.

### 6) Manager generates report
1. Login as manager
2. Open **/reports**
3. Select:
   - Zone
   - From date
   - To date
4. Click **Generate report**

You should see a table:
- Rows = days
- Columns = fixed time buckets:
  - 06:00–09:00
  - 09:00–12:00
  - 12:00–15:00
  - 15:00–18:00
  - 18:00–21:00
- Each bucket shows aggregated values required by the exam:
  1. `greenWithCars`
  2. `greenWithoutCars + redWithoutCars`
  3. `redWithCars`

---

## Troubleshooting (quick tips)

### “Can’t connect to MySQL”
- Check `backend/.env` → `DB_URL`
- Make sure MySQL service is running
- Ensure the MySQL user/password exist

### Ports conflict
- Backend uses `http://localhost:4000`
- Frontend uses `http://localhost:5173`
- If a port is busy, change the `PORT` in `backend/.env` (backend) and adjust frontend if needed.

### Google login doesn’t work
- Fill in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`
- Restart backend

