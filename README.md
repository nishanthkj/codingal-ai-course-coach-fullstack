


#  Codingal — AI Course Coach (Full-Stack)

Built by **Nishanth**

Full-stack project combining a **React + TypeScript frontend** with a **Django + DRF backend**.  
Implements a deterministic, explainable AI Course Coach that recommends the next learning activity and analyzes code locally — without remote AI APIs.

---

## 📘 Table of Contents
1. [Overview](#overview)  
2. [Architecture](#architecture)  
3. [Folder Structure](#folder-structure)  
4. [Installation](#installation)  
5. [Backend](#backend)  
6. [Frontend](#frontend)  
7. [API Endpoints](#api-endpoints)  
8. [Usage & Flow](#usage--flow)  
9. [Recommender System](#recommender-system)  
10. [Static Code Analyzer](#static-code-analyzer)  
11. [Testing](#testing)  
12. [Docker Setup](#docker-setup)  
13. [Design Note](#design-note)  
14. [License](#license)

---

## 🧩 Overview
The **AI Course Coach** platform helps students monitor their progress, receive deterministic recommendations for next lessons, and analyze code attempts locally using heuristic-based analysis.

---

## 🏗️ Architecture
* **Backend:** Django + DRF + SQLite; REST APIs, recommender logic, authentication module.  
* **Frontend:** React + TypeScript + Vite + Tailwind; local JS static analyzer.  
* **Testing:** `pytest-django` and `vitest`.

---

## 📁 Folder Structure
```

backend/
├── app/
│ ├── core/
│ │ ├── management/commands/
│ │ ├── services/
│ │ ├── tests/
│ │ ├── serializers.py
│ │ └── views.py
│ │
│ ├── users/
│ │ ├── migrations/
│ │ ├── serializers.py
│ │ ├── views.py
│ │ ├── urls.py
│ │ ├── models.py
│ │ └── tests/
│ │
│ └── manage.py
frontend/
├── src/
│   ├── ai/
│   │   ├── recommender.ts
│   │   ├── explain.ts
│   │   └── codeChecks/
│   ├── components/
│   ├── routes/
│   ├── styles/
│   └── lib/
└── tests/
└── ai/

````

---

## ⚙️ Installation

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
````

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔌 API Endpoints

### Core Student & Course APIs

```
GET     /api/students/overview/
GET     /api/students/recommendation/
POST    /api/attempts/
POST    /api/analyze-code/
GET     /api/courses/
GET     /api/courses/<id>/
GET     /api/lesson/<course_id>/
```

### Authentication APIs (JWT)

```
POST    /api/user/register/
POST    /api/user/login/
POST    /api/user/refresh/
GET     /api/user/me/
POST    /api/user/logout/
POST    /api/user/verify/
GET     /api/user/profile/
```

### Documentation & Schema

```
GET     /api/schema/
GET     /api/docs/
GET     /api/redoc/
```

### Admin & Base Routes

```
GET     /
GET     /admin/
```

---

## 🧭 Usage & Flow

### Step-by-step user flow:

1. **Register a new user**

   * Endpoint: `POST /api/user/register/`
   * Example payload:

     ```json
     {
       "email": "user@example.com",
       "password": "user@123",
       "username": "student1"
     }
     ```
2. **Login to get token**

   * Endpoint: `POST /api/user/login/`
   * Returns JWT access & refresh tokens.
3. **Access profile**

   * Endpoint: `GET /api/user/me/`
   * Use `Authorization: Bearer <access_token>` in header.
4. **View available courses**

   * Endpoint: `GET /api/courses/`
5. **View lessons in a course**

   * Endpoint: `GET /api/lesson/<course_id>/`
6. **View student overview**

   * Endpoint: `GET /api/students/overview/`
7. **Get AI recommendation**

   * Endpoint: `GET /api/students/recommendation/`
   * Returns next activity + confidence + reasons.
8. **Submit learning attempt**

   * Endpoint: `POST /api/attempts/`
9. **Analyze code**

   * Endpoint: `POST /api/analyze-code/`
10. **Logout**

    * Endpoint: `POST /api/user/logout/`

---

## 🧮 Recommender System

* Location: `backend/app/core/services/recommender.py`
* Features:

  * `time_since_last_activity`
  * `avg_correctness_7d` / `avg_correctness_30d`
  * `progress_gap`
  * `tag_mastery_gap`
  * `hint_rate`
  * `difficulty_drift`
  * `attempts_to_completion_ratio`
* Deterministic heuristic weighting with confidence mapping and alternatives.

---

## 🧰 Static Code Analyzer

* Location: `frontend/src/ai/codeChecks/`
* Implemented rules:

  1. Unused variables
  2. Off-by-one loops
  3. Missing return in non-void functions
  4. Duplicate blocks

---

## 🧪 Testing

### Backend

```bash
python manage.py test
```

Run a specific test:

```bash
python manage.py test core.tests.test_models.StudentModelTest.test_student_creation
```

### Frontend

```bash
npx vitest
```

---

## 🐳 Docker Setup

Short Docker commands:

```bash
# Build and start containers
docker-compose up --build

# Run in background
docker-compose up -d

# Stop all containers
docker-compose down
```

Access after start:

* **Frontend:** [http://localhost:3000](http://localhost:3000)
* **Backend API:** [http://localhost:8000/api/](http://localhost:8000/api/)
* **Admin Panel:** [http://localhost:8000/admin/](http://localhost:8000/admin/)
* **PGAdmin:** [http://localhost:5050](http://localhost:5050)

  * `PGADMIN_DEFAULT_EMAIL=admin@admin.co`
  * `PGADMIN_DEFAULT_PASSWORD=admin`

---

## 🧠 Design Note

The recommender uses deterministic, rule-based scoring.
Weighted features yield reproducible recommendations with clear confidence levels.
Tie-breaking: `lesson order_index` → `lesson id`.

---

