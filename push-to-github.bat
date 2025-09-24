@echo off
echo 🚀 Pushing Pocketa to GitHub...
echo.
echo Please make sure you've created a GitHub repository first!
echo Repository name should be: pocketa
echo.
set /p username=Enter your GitHub username:
echo.
echo Adding remote origin...
git remote add origin https://github.com/%username%/pocketa.git
echo.
echo Pushing to GitHub...
git branch -M main
git push -u origin main
echo.
echo ✅ Successfully pushed Pocketa to GitHub!
echo Repository URL: https://github.com/%username%/pocketa
echo.
echo 🎯 Next steps:
echo 1. Visit your GitHub repository
echo 2. Deploy to Railway, Vercel, or your preferred platform
echo 3. Add MongoDB Atlas connection string
echo 4. Your AI will start learning from real users!
echo.
pause