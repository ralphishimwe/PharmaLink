# PharmaLink

PharmaLink is a pharmacy management web application built for Rwanda's pharmacy network. It allows users to search for medicines, find pharmacies that have them in stock, place orders, and pay online via Stripe. Staff can manage inventory and orders, while admins have full control over users, pharmacies, medicines, inventories, orders, and payments.

## Live Application

| Service  | Platform | URL                                         |
|----------|----------|---------------------------------------------|
| Frontend | Vercel   | https://pharmalinkrwanda.vercel.app         |
| Backend  | Render   | https://pharmalink-16j6.onrender.com/api/v1 |

> **Note:** The backend is hosted on Render's free tier and may take 30–60 seconds to wake up after a period of inactivity. If the app feels slow on first load, wait a moment and try again.

---

## Features

- **Users** — sign up, log in, search medicines by name, view pharmacies and their inventory, place orders, pay via Stripe, and manage their profile
- **Staff** — manage inventory for their pharmacy, view and update orders and payments
- **Admins** — full CRUD access to users, pharmacies, medicines, inventories, orders, and payments via a dedicated dashboard

---

## Tech Stack

**Frontend**
- React + React Router
- Vite
- Axios
- Stripe.js

**Backend**
- Node.js + Express
- MongoDB + Mongoose (MongoDB Atlas)
- Stripe (payments)
- JWT (authentication)
- Helmet, CORS, rate limiting, XSS protection

---

## Prerequisites

Make sure you have the following installed on your machine before running the project locally:

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) (comes with Node.js)
### Accounts required
- A MongoDB Atlas account with a cluster set up
- A Stripe account for handling payment

---

## Running Locally

### 1. Clone the repository
- git clone https://github.com/ralphishimwe/PharmaLink.git
- cd PharmaLink

### 2. Set up the backend

#### 1. Install backend dependencies from the root of the project:

npm install


#### 2. Create a `config.env` file in the root of the project with the following variables:
This project requires environment variables to run locally and in production.

A full list of required variables and their values can be found here under dependencies - config.env link:  
**Link: https://docs.google.com/document/d/1SZTP9Hl9i6zUnj5cirUNc-dRHwteJ-BW_HS5SMOC4Pg/edit?usp=sharing** 

#### 3. Start the backend:

npm start


The backend will run on `http://localhost:9000`.

### 3. Set up the frontend

#### 1. Open a new terminal and navigate to the frontend folder:

- cd frontend
- npm install


#### 2. Create a `.env` file inside the `frontend` folder:

VITE_API_URL=http://localhost:9000/api/v1


#### 3. Start the frontend:

npm run dev


The app will open at `http://localhost:5173`.

---

## Deployment (How This Project Was Deployed)

The frontend and backend were deployed on two separate platforms.

### Frontend — Vercel

1. Push code to GitHub
2. Import the repo on [Vercel](https://vercel.com)
3. Set the **Root Directory** to `frontend` in Vercel project settings
4. Add this environment variable in the Vercel dashboard under Settings → Environment Variables:
   VITE_API_URL = https://pharmalink-16j6.onrender.com/api/v1
5. Deploy — Vercel rebuilds automatically on every push

### Backend — Render

1. Create a new **Web Service** on [Render](https://render.com) pointing to repository
2. Set the **Root Directory** to the repo root (where `server.js` lives)
3. Set **Build Command** to `npm install` and **Start Command** to `npm start`
4. Add all variables from your `config.env` as environment variables in the Render dashboard, plus:
   FRONTEND_URL = https://pharmalinkrwanda.vercel.app
   NODE_ENV = production
5. Render redeploys automatically on every push to your connected branch

---

## Project Structure

```
├── app.js                  # Express app setup (CORS, middleware, routes)
├── server.js               # Server entry point and MongoDB connection
├── config.env              # Environment variables (not committed to git)
├── controllers/            # Route handler logic
├── models/                 # Mongoose schemas
├── routes/                 # Express route definitions
├── services/               # Stripe and payment provider logic
├── utils/                  # Helper utilities
└── frontend/
    ├── src/
    │   ├── pages/          # React page components
    │   ├── components/     # Shared UI components (Navbar, Layout, etc.)
    │   ├── context/        # Auth context (React Context API)
    │   ├── styles/         # CSS files
    │   └── utils/api.js    # Axios instance (central API config)
    ├── public/
    │   └── medicines/      # Medicine images served statically
    ├── .env                # Local dev environment variables (not committed)
    ├── .env.production     # Production environment variables (Vercel build)
    └── vercel.json         # SPA routing config for Vercel
```

---

## User Roles

| Role  | Access                                                               |
|-------|----------------------------------------------------------------------|
| User  | Search medicines, view pharmacies, place orders, pay, manage profile |
| Staff | Manage pharmacy inventory, view and update orders and payments       |
| Admin | Full dashboard — CRUD on all resources                               |
