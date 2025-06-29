# TaskFlow - Task Management Application

A modern task management application built with React, Node.js, Express, and PostgreSQL.

## Features

- User Authentication
- Task Creation and Management
- Task Filtering and Search
- Team Collaboration
- Real-time Updates
- Responsive Design

## Tech Stack

### Frontend
- React
- Tailwind CSS
- Axios
- React Context API

### Backend
- Node.js
- Express
- PostgreSQL
- Sequelize ORM
- JSON Web Tokens

## Prerequisites

Before you begin, ensure you have installed:
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd taskflow-saas
```

2. Set up environment variables:
   - Copy `.env.example` to `.env` in the server directory
   - Update the values according to your setup

### Required Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskflow_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# API Configuration
API_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000
```

## Installation

### Backend Setup
```bash
cd server
npm install
npm run dev
```

### Frontend Setup
```bash
cd client
npm install
npm start
```

## Development

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## API Documentation

### Authentication Endpoints
- POST /api/auth/register - Register a new user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user

### Task Endpoints
- GET /api/tasks - Get all tasks
- POST /api/tasks - Create a new task
- GET /api/tasks/:id - Get task by ID
- PUT /api/tasks/:id - Update task
- DELETE /api/tasks/:id - Delete task

### Team Endpoints
- GET /api/teams - Get all teams
- POST /api/teams - Create a new team
- GET /api/teams/:id - Get team by ID
- PUT /api/teams/:id - Update team
- DELETE /api/teams/:id - Delete team

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details 