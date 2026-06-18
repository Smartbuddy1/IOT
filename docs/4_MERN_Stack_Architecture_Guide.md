# 4. MERN Stack Architecture Guide

SmartBuddy is built on the modern MERN stack. We recently migrated completely away from the legacy PHP backend to ensure better performance, real-time capabilities, and easier maintenance.

## 1. Database Layer (MySQL)
While "M" in MERN usually stands for MongoDB, this project uses a relational database (**MySQL**) because transactional integrity (payments, project mappings) is critical.
- We use the `mysql2/promise` package in Node.js to securely execute async queries.
- **Key Tables**: `clients`, `projects`, `machines`, `trans` (transactions), `datatest` (live telemetry), `users` (admin/staff accounts).

## 2. Express Backend (`server/`)
The backend is an Express.js REST API.
- **Controllers**: Contain the business logic (e.g., `machineController.js`, `iotController.js`).
- **Routes**: Define the endpoints and map them to controllers. Protected by JWT middleware.
- **Middleware**: `authMiddleware.js` verifies JWT tokens before letting users access sensitive routes.
- **Services**: `mqttService.js` runs in the background to handle instant messaging with the hardware.

## 3. React Frontend (`frontend/`)
The frontend is a Single Page Application (SPA) built with React and Vite.
- **Styling**: Standard CSS with dynamic glass-morphism classes (`glass-panel`).
- **State Management**: React Context (`AuthContext.jsx`) is used to store the logged-in user's profile and token globally.
- **Routing**: `react-router-dom` handles page navigation without reloading the browser.
- **Charts**: We use `recharts` to render beautiful, interactive data visualizations on the dashboard and reports pages.

## API Security & Authentication
1. When an admin logs in, the Node.js server verifies the password and generates a **JSON Web Token (JWT)**.
2. This token is sent to React, which saves it in `localStorage`.
3. Every time React wants to fetch private data (e.g., the dashboard stats), it attaches this JWT in the `Authorization: Bearer <token>` HTTP header.
4. If the token is missing or expired, the backend rejects the request with a 401 error, and React boots the user back to the login page.
