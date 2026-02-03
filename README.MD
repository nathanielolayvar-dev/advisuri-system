# 🎓 Advisuri System

A robust full-stack application leveraging a **Django REST Framework** backend and a **React (Vite + TypeScript)** frontend.  
The entire environment is fully containerized for a seamless development experience.

---

## 🚀 Getting Started with Docker (Recommended)

This is the fastest path to deployment. No need to install Python, Node, or PostgreSQL locally.

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd advisuri-system
```

### 2. Launch the stack
```bash
docker-compose up --build
```

### 3. Access the services
| Service      | URL                       |
|-------------|---------------------------|
| Frontend    | http://localhost:5173     |
| Backend API | http://localhost:8000     |
| Database    | PostgreSQL on port 5432   |


## 🛠 Manual Setup (Local Development)
If you prefer to run services natively in separate terminals:

### Backend (Django)
```bash
cd backend
python -m venv venv
```
### Activate virtual environment

- Windows:
```bash
.\venv\Scripts\activate
```
- macOS / Linux:
```bash
source venv/bin/activate
```
- Install dependencies and run server
```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend (React + TypeScript)
```bash
cd frontend
npm install
npm run dev
```


## 🔧 Project Configuration

### Google OAuth Setup

This project integrates **django-allauth** and **@react-oauth/google**.

#### Google Cloud Console

1. Create **OAuth 2.0 Credentials**
2. Set the following values:

### Authorized JavaScript Origins
```bash
http://localhost:5173
```
### Authorized Redirect URIs
```bash
http://localhost:8000/accounts/google/login/callback/
```
### Environment Variables
Create a .env file in the backend/ directory:
```bash
DEBUG=True
SECRET_KEY=your_secret_key_here
DATABASE_URL=postgres://postgres:postgres@db:5432/postgres
GOOGLE_CLIENT_ID=your_id_here
GOOGLE_CLIENT_SECRET=your_secret_here
```
## 💡 Utility Commands

| Action            | Docker Command |
|------------------|----------------|
| Create migrations | `docker-compose exec backend python manage.py makemigrations` |
| Apply migrations  | `docker-compose exec backend python manage.py migrate` |
| Create superuser  | `docker-compose exec backend python manage.py createsuperuser` |

### VS Code Tip
```bash
Ctrl + Shift + P → TypeScript: Restart TS Server
```
## 📦 Tech Stack

### Frontend
- React (Vite)
- TypeScript

### Backend
- Django REST Framework
- Supabase

### Infrastructure
- Docker
- Docker Compose


