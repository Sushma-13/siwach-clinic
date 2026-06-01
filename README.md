# 🏥 Siwach Sanjeevani Orthopaedic Clinic — Patient Management System

Full-stack **Next.js 16** application for managing patients, visit history, and appointments.

---

## ✨ Features

- **🔐 Secure Authentication** — JWT-based login, role support (Admin, Doctor, Receptionist)
- **📋 Patient Management** — Register, search, view and update patient records
- **🩺 Visit History** — Complete medical history per patient
- **📅 Appointment Scheduling** — Weekly calendar view + booking
- **📊 Dashboard** — Real-time stats, today's schedule, completion tracking
- **🎨 Soothing Light Theme** — Warm sage greens and cream tones, Playfair Display + DM Sans

---

## 🛠 Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Framework | **Next.js 16.2** (App Router)     |
| Runtime   | **React 19**                      |
| Language  | **TypeScript 5.8**                |
| Database  | **PostgreSQL** via `pg`           |
| Auth      | **JWT** + **bcryptjs**            |
| Styling   | **Tailwind CSS 3.4**              |
| Icons     | **Lucide React**                  |
| Bundler   | **Turbopack** (default in v16)    |

---

## 🗂 Project Structure

```
siwach-clinic/
├── next.config.ts               # Next.js 16 config (turbopack top-level)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/            # POST login, DELETE logout, GET /me
│   │   │   ├── patients/        # CRUD + [id]/visits
│   │   │   └── appointments/    # List/create + /dashboard stats
│   │   ├── login/               # Login page
│   │   ├── dashboard/           # Dashboard (Server Component)
│   │   ├── patients/            # Patient list + [id] detail
│   │   └── appointments/        # Appointments page
│   ├── components/layout/
│   │   └── Sidebar.tsx
│   ├── lib/
│   │   ├── db.ts                # PostgreSQL connection pool
│   │   └── auth.ts              # JWT sign/verify, bcrypt
│   └── types/index.ts
├── scripts/
│   ├── migrate.js               # DB schema
│   └── seed.js                  # Sample data
└── .env.local.example
```

---

## 🚀 Setup

### Requirements
- **Node.js 20.9+** (required by Next.js 16)
- **PostgreSQL 14+**

### 1. Install
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.local.example .env.local
```
Edit `.env.local`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/siwach_clinic
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### 3. Create DB & run migrations
```bash
createdb siwach_clinic
npm run db:migrate
```

### 4. Seed sample data
```bash
npm run db:seed
```

### 5. Start dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Demo Credentials

| Role         | Email                           | Password  |
|--------------|---------------------------------|-----------|
| Admin/Doctor | admin@siwachsanjeevani.com      | admin123  |
| Doctor       | priya@siwachsanjeevani.com      | doctor123 |
| Receptionist | reception@siwachsanjeevani.com  | doctor123 |

---

## 🆕 Next.js 16 Key Changes Applied

- **`cookies()` / `headers()` are now async** — all calls use `await cookies()`
- **`params` in route handlers is a `Promise`** — all dynamic routes use `await params`
- **`next.config.ts`** — TypeScript config (replaces `.mjs`)
- **`serverExternalPackages`** — top-level (moved from `experimental`)
- **`turbopack`** — top-level config key (default bundler)
- **Turbopack by default** — `next dev` and `next build` both use Turbopack
- **React 19** — updated peer dependencies

---

## 🔌 API Reference

| Method | Endpoint                        | Auth | Description                    |
|--------|---------------------------------|------|--------------------------------|
| POST   | /api/auth                       | No   | Login                          |
| DELETE | /api/auth                       | Yes  | Logout                         |
| GET    | /api/auth/me                    | Yes  | Current user                   |
| GET    | /api/patients                   | Yes  | List patients (search/paginate)|
| POST   | /api/patients                   | Yes  | Create patient                 |
| GET    | /api/patients/:id               | Yes  | Patient + full history         |
| PUT    | /api/patients/:id               | Yes  | Update patient                 |
| DELETE | /api/patients/:id               | Admin| Delete patient                 |
| POST   | /api/patients/:id/visits        | Yes  | Add visit record               |
| GET    | /api/appointments               | Yes  | List appointments (by date)    |
| POST   | /api/appointments               | Yes  | Schedule appointment           |
| GET    | /api/appointments/dashboard     | Yes  | Dashboard stats                |

---

## 🏗 Production

```bash
npm run build
npm start
```

Set `NODE_ENV=production`, a strong `JWT_SECRET`, and a production `DATABASE_URL`.
