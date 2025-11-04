# OpsBot - AI-Powered Operations Dashboard

A React-based operations dashboard with AI chatbot integration using Google's Gemini AI API. The application features a modern sidebar navigation similar to Gemini AI's interface with multiple operational modules.

## 🚀 Features

### 📊 **Dashboard Modules**

- **Account** - Sends account information request to AI chatbot
- **Bench Report** - Requests comprehensive bench status report from AI
- **Certification** - Queries AI for certification tracking information
- **GT Allocation** - Asks AI for project allocation and resource reports
- **Chat Bot** - Direct AI conversation interface

### 🤖 **AI Chat Bot**

- Powered by Google Gemini 2.0 Flash (Experimental) API
- **Direct REST API**: Using native fetch() for better performance and control
- **Smart Navigation**: Clicking sidebar items sends specialized prompts to AI
- Enhanced prompts for specific report types (Account, Bench, Certification, GT Allocation)
- Real-time conversations with context-aware responses
- Message history and timestamps
- Modern chat interface with user/bot message differentiation
- Advanced error handling with auto-retry logic
- Built-in API connection testing and network troubleshooting

### 🎯 **Intelligent Request Handling**

- **Account Requests**: Generates detailed user profile and account information
- **Bench Reports**: Creates comprehensive availability and skills analysis
- **Certification Tracking**: Provides certification status and development recommendations
- **GT Allocation**: Delivers project allocation and resource utilization reports
- **Natural Conversation**: Direct chat for any other questions or requests

### 🎨 **Modern UI/UX**

- Responsive design for desktop and mobile
- Clean, professional interface inspired by Google's design language
- Sidebar navigation with active state indicators
- Card-based layouts for data visualization
- Status badges and progress indicators

## 🛠 Technology Stack

- **Frontend**: React 18 with Vite
- **AI Integration**: Google Generative AI (Direct REST API)
- **Icons**: Lucide React
- **Styling**: CSS3 with modern features
- **Build Tool**: Vite for fast development and building

## 📁 Project Structure

```
src/
├── components/
│   ├── Layout.jsx          # Main layout with intelligent sidebar navigation
│   └── Layout.css          # Layout styles
├── pages/
│   ├── ChatBot.jsx         # AI chatbot interface with enhanced prompts
│   ├── ChatBot.css         # Chatbot specific styles
│   └── Pages.css           # Shared styles (legacy, can be removed)
├── assets/
│   └── react.svg           # React logo
├── App.jsx                 # Main application component with ref handling
├── App.css                 # Application styles
├── main.jsx                # Application entry point
└── index.css               # Global styles
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd Opsbot
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory:

   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5174` (or the port shown in terminal)

## 🔑 API Configuration

The application uses Google's Gemini AI API for the chatbot functionality. The API key is configured in the `.env` file:

```env
VITE_GEMINI_API_KEY=AIzaSyC_RGi0NmujdtlCvhQ2EOhqXgaz4pCC8k4
```

> **Note**: The API key is included for demo purposes. In production, ensure API keys are properly secured.

## 📱 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the app for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint for code quality checks

## 🎯 Key Features by Module

### 🤖 Chat Bot

- Real-time AI conversations using Gemini Pro
- Message persistence during session
- Typing indicators and loading states
- Responsive chat interface
- Error handling for API failures

### 👤 Account

- User profile information display
- Contact details and role information
- Clean, card-based layout

### 📊 Bench Report

- Employee availability tracking
- Status indicators (Available, Training, Partial)
- Skills and duration information
- Statistical overview cards

### 🏆 Certification

- Professional certification tracking
- Status management (Completed, In Progress, Planned)
- Issue and expiry date tracking
- Visual status indicators

### 📈 GT Allocation

- Project allocation visualization
- Team size and allocation percentage tracking
- Client and project information
- Progress bars and status indicators

## 🎨 Design System

### Colors

- **Primary**: #1a73e8 (Google Blue)
- **Success**: #34a853 (Green)
- **Warning**: #fbbc04 (Yellow)
- **Error**: #ea4335 (Red)
- **Text**: #202124 (Dark Gray)
- **Secondary Text**: #5f6368 (Medium Gray)

### Typography

- **Font Family**: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- **Headings**: Weight 600, optimized line height
- **Body**: Weight 400, 1.5 line height

## 📱 Responsive Design

The application is fully responsive with:

- Mobile-first approach
- Collapsible sidebar navigation
- Touch-friendly interface elements
- Optimized layouts for different screen sizes

## 🔧 Development

### Code Style

- Modern React with Hooks
- Functional components
- CSS modules for styling
- ESLint for code quality

### Performance

- Vite for fast development and building
- Code splitting with React Router
- Optimized bundle size
- Lazy loading where applicable

## 🚀 Deployment

Build the application for production:

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

## 📄 License

This project is part of the OpsBot operations dashboard system.

---

**Built with ❤️ using React, Vite, and Google Gemini AI**
