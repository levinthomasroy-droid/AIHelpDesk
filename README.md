# AI HelpDesk

An AI-powered IT HelpDesk web application built with Django REST Framework, React, and Ollama. It helps users raise and manage support tickets while providing AI-assisted troubleshooting.

## Features

- JWT-based user authentication
- Role-based dashboards for Admin, Employee, and Technician
- Create, view, update, and manage support tickets
- Assign tickets to technicians
- Track ticket status and priority
- AI-powered IT troubleshooting assistant
- Persistent AI chat history
- Clear chat history
- Responsive React interface
- REST API integration

## Technology Stack

**Backend**
- Python
- Django
- Django REST Framework
- Simple JWT
- SQLite (local development)

**Frontend**
- React
- Vite
- JavaScript
- CSS

**AI**
- Ollama
- Llama 3.2 (3B)

## Project Structure

```text
AIHelpDesk/
├── accounts/
├── aiassistant/
├── config/
├── tickets/
├── frontend/
│   ├── public/
│   └── src/
├── manage.py
└── .gitignore
```

## Local Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd AIHelpDesk
```

### 2. Set up the Python environment

```bash
python -m venv venv
venv\Scripts\activate
```

### 3. Install backend dependencies

Install the project's dependencies after creating the `requirements.txt` file.

```bash
pip install -r requirements.txt
```

### 4. Configure the Django secret key

Set a local secret key in your Windows environment:

```cmd
set DJANGO_SECRET_KEY=your-generated-secret-key
```

Never commit your actual secret key.

### 5. Run database migrations

```bash
python manage.py migrate
```

### 6. Start the Django server

```bash
python manage.py runserver
```

### 7. Start the React frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

### 8. Start the AI service

Install Ollama, download the Llama 3.2 model, and ensure the Ollama service is running.

```bash
ollama pull llama3.2:3b
ollama serve
```

## API Endpoints

| Endpoint | Purpose |
|---|---|
| `/api/token/` | Obtain JWT tokens |
| `/api/token/refresh/` | Refresh access token |
| `/api/tickets/` | Manage support tickets |
| `/api/ai/chat/` | AI assistant chat |
| `/api/ai/history/` | Retrieve chat history |
| `/api/ai/clear/` | Clear chat history |

## Development Status

Core application features have been implemented and manually tested locally. Automated test cases and production deployment are still pending.

## Author

**Levin Thomas Roy**

GitHub: https://github.com/levinthomasroy-droid