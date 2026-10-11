# UniWell – Mental Health Check-in & Counsellor Booking Mobile Application

UniWell is a mobile application designed to support university students' mental well-being by providing daily mental health check-ins, self-help resources, emergency support information, and counsellor appointment booking. The application also provides counsellors with appointment management features and administrators with counsellor approval and reporting capabilities.

## Features

### Student Features
- Student registration and login.
- Email OTP verification.
- Daily mental health check-ins.
- View check-in results and history.
- Access self-help resources.
- View emergency support information.
- Browse approved counsellors and book available counselling sessions.
- Manage profile information.

### Counsellor Features
- Counsellor registration and approval workflow.
- Manage profile information.
- Manage appointment availability.
- View and manage counselling appointments.
- Access relevant student appointment information.
- Manage counselling resources, where supported.

### University Administrator Features
- Review and approve pending counsellor registrations.
- Manage counsellor access.
- View reports and relevant system information.
- Access anonymised reporting features, where implemented.

## Technology Stack

**Frontend**
- React Native
- Expo
- JavaScript / TypeScript, depending on the module implementation

**Backend**
- Node.js
- Express.js
- REST API

**Database**
- MongoDB Atlas

**Authentication and Security**
- JSON Web Tokens (JWT)
- Password hashing
- Email OTP verification
- Role-based access control

## Project Structure

```text
UniWell-Mobile-App/
├── frontend/       # React Native / Expo application
├── backend/        # Node.js / Express API
├── README.md
└── .gitignore
```

*The structure may vary depending on the current repository version.*

## Prerequisites

Make sure you have installed:

- Node.js and npm
- Git
- Expo Go or an Android emulator
- MongoDB Atlas account or an accessible MongoDB instance
- A code editor such as Visual Studio Code

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/prathibhagunathilaka/UniWell-Mobile-App.git
cd UniWell-Mobile-App
```

### 2. Set Up the Backend

Open a terminal and run:

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory using the project's `.env.example` file as a reference.

Configure the required environment variables, including the MongoDB connection string, JWT secret, and email/SMTP settings required by the application.

Start the backend:

```bash
node server.js
```

The backend should start on the port configured in the environment variables, commonly port `5000`.

### 3. Set Up the Frontend

Open a separate terminal:

```bash
cd frontend
npm install
```

Configure the frontend API URL in the appropriate environment file. For example:

```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:5000/api
```

Replace `YOUR_COMPUTER_IP` with your computer's local IP address when testing on a physical phone. Ensure that the phone and computer can communicate over the network.

### 4. Run the Mobile Application

From the `frontend` directory, run:

```bash
npx expo start
```

Scan the QR code using Expo Go, or open the application using a supported emulator or development build.

## Environment Configuration

Do not commit passwords, API secrets, MongoDB credentials, email app passwords, or the real `.env` file to GitHub.

Use `.env.example` to document the required configuration variables without including real secret values.

## Security and Privacy

UniWell is designed to support student privacy and protect sensitive mental health information. Authentication, access restrictions, and anonymised reporting should be verified through testing to ensure that users can access only the information permitted by their roles.

## Testing

Testing activities may include:

- Authentication and email OTP verification.
- Mental health check-in submission and history.
- Counsellor availability and appointment booking.
- Appointment cancellation and status management.
- Role-based access control.
- Self-help resources and emergency support.
- Administrator counsellor approval and reporting.
- Usability evaluation with representative users.

Refer to the project report and test documentation for the test cases, results, and known limitations.

## Academic Project

**Module:** IT3060 – Human Computer Interaction (HCI)  
**Project:** UniWell – Mental Health Check-in & Counsellor Booking Mobile Application

Developed as a university group project to improve access to mental health support for university students.

## License

This project was developed for academic purposes. Add a formal license if the project is intended for public reuse or distribution.
