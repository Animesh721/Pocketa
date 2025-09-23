# Smart Allowance Tracker

A full-stack web application for students to track their allowances, fixed essentials, and expenses with AI-powered financial advice.

## Features

- **User Authentication**: Secure JWT-based login and registration
- **Setup Wizard**: Configure allowance amount, frequency, and fixed essentials
- **Expense Tracking**: Record expenses across three categories:
  - **Allowance**: Regular spending from weekly/monthly allowance
  - **Essentials**: Fixed monthly expenses (rent, utilities, etc.)
  - **Extra**: One-time special purchases outside regular budget
- **Dashboard Analytics**:
  - Real-time spending progress bars
  - Category-wise expense breakdown charts
  - Current period vs budget tracking
  - Recent transactions overview
- **AI Financial Advice**: Personalized spending tips based on your patterns
- **Responsive Design**: Works perfectly on desktop and mobile devices

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **OpenAI API** integration for financial advice

### Frontend
- **React 18** with hooks and functional components
- **React Router** for navigation
- **Context API** for state management
- **TailwindCSS** for styling
- **Recharts** for data visualization
- **Axios** for API calls

## Project Structure

```
fin-app/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Essential.js
│   │   └── Transaction.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── user.js
│   │   ├── transactions.js
│   │   ├── stats.js
│   │   └── advice.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AllowanceProgress.js
│   │   │   ├── EssentialsSummary.js
│   │   │   ├── ExpenseChart.js
│   │   │   ├── RecentTransactions.js
│   │   │   ├── LoadingSpinner.js
│   │   │   └── Navbar.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Setup.js
│   │   │   ├── Dashboard.js
│   │   │   ├── AddExpense.js
│   │   │   └── AIAdvice.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smart-allowance-tracker
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
OPENAI_API_KEY=your-openai-api-key-here
```

4. Start the backend server:
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Install and setup TailwindCSS:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

4. Start the frontend development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

### Database Setup

#### Option 1: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. The app will automatically create the database and collections

#### Option 2: MongoDB Atlas (Recommended)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Update the `MONGODB_URI` in your `.env` file

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### User Management
- `GET /api/user/settings` - Get user settings and essentials
- `POST /api/user/settings` - Update user settings and essentials

### Transactions
- `GET /api/transactions` - Get user transactions (with pagination)
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Analytics
- `GET /api/stats` - Get dashboard statistics and analytics

### AI Advice
- `GET /api/advice` - Get personalized financial advice

## Usage Guide

### Initial Setup
1. **Register/Login**: Create an account or sign in
2. **Configure Allowance**: Set your weekly/monthly allowance amount
3. **Add Essentials**: (Optional) Add fixed monthly expenses like rent, utilities
4. **Start Tracking**: Begin recording your daily expenses

### Adding Expenses
- **Allowance**: Everyday spending like food, transport, entertainment
- **Essentials**: Fixed monthly bills you've already configured
- **Extra**: One-time purchases outside your regular budget

### Understanding the Dashboard
- **Allowance Progress**: Shows spending vs budget for current period
- **Essentials Summary**: Monthly fixed expenses tracking
- **Expense Chart**: Visual breakdown by category
- **Recent Transactions**: Latest spending activity

### AI Advice
- Get personalized tips based on your spending patterns
- Recommendations for better budget management
- Insights into your financial habits

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smart-allowance-tracker
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
OPENAI_API_KEY=your-openai-api-key-here
```

### Frontend
No additional environment variables required. The frontend uses a proxy to communicate with the backend.

## Deployment

### Backend Deployment (Railway/Render/Heroku)

1. **Railway**:
```bash
railway login
railway init
railway add
railway deploy
```

2. **Render**:
   - Connect your GitHub repository
   - Set build command: `npm install`
   - Set start command: `npm start`
   - Add environment variables

### Frontend Deployment (Netlify/Vercel)

1. **Netlify**:
```bash
npm run build
# Upload dist/ folder to Netlify
```

2. **Vercel**:
```bash
vercel
```

### Database (MongoDB Atlas)
- Create a free cluster on MongoDB Atlas
- Whitelist your deployment platform's IP addresses
- Update connection string in production environment variables

## Features in Detail

### Authentication System
- Secure JWT-based authentication
- Password hashing with bcrypt
- Protected routes and middleware
- Automatic token validation and refresh

### Expense Categories
- **Allowance**: Regular spending from your allowance budget
- **Essentials**: Fixed monthly expenses with due dates
- **Extra**: One-time purchases outside regular budget

### Analytics & Insights
- Real-time budget tracking
- Visual spending breakdowns
- Period-based analysis (weekly/monthly)
- Spending pattern detection

### AI Integration
- OpenAI-powered financial advice
- Personalized recommendations
- Spending pattern analysis
- Budget optimization suggestions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues or have questions:
1. Check the troubleshooting section below
2. Open an issue on GitHub
3. Contact the development team

## Troubleshooting

### Common Issues

**Backend won't start:**
- Check if MongoDB is running
- Verify environment variables in `.env`
- Ensure port 5000 is not in use

**Frontend can't connect to backend:**
- Ensure backend is running on port 5000
- Check proxy configuration in `package.json`
- Verify CORS settings

**Authentication issues:**
- Check JWT_SECRET in environment variables
- Clear browser localStorage and try again
- Verify token expiration settings

**Database connection issues:**
- Check MongoDB connection string
- Ensure database permissions are correct
- Verify network access (especially for Atlas)

### Performance Tips
- Use MongoDB indexes for better query performance
- Implement pagination for large transaction lists
- Add caching for frequently accessed data
- Optimize bundle size for production builds

## Future Enhancements

- [ ] Expense categories customization
- [ ] Budget goals and savings tracking
- [ ] Data export functionality
- [ ] Mobile app development
- [ ] Multi-currency support
- [ ] Family/shared account features
- [ ] Advanced analytics and reports
- [ ] Integration with bank APIs
- [ ] Push notifications for budget alerts
- [ ] Social features and spending challenges

---

**Happy budgeting! 💰📊**