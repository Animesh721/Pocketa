const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Essential = require('../models/Essential');
const AllowanceTopup = require('../models/AllowanceTopup');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const essentials = await Essential.find({ userId: req.user._id, isActive: true });
    const allowanceTopups = await AllowanceTopup.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(5);

    const now = new Date();
    let periodStart, periodEnd;

    if (user.allowanceFrequency === 'weekly') {
      const dayOfWeek = now.getDay();
      const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      periodEnd = new Date(now);
      periodEnd.setDate(now.getDate() + daysToSunday);
      periodEnd.setHours(23, 59, 59, 999);

      periodStart = new Date(periodEnd);
      periodStart.setDate(periodEnd.getDate() - 6);
      periodStart.setHours(0, 0, 0, 0);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const transactions = await Transaction.find({
      userId: req.user._id,
      type: 'expense',
      date: { $gte: periodStart, $lte: periodEnd }
    }).sort({ date: -1 });

    const categoryTotals = transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    const totalEssentials = essentials.reduce((sum, e) => sum + e.amount, 0);
    const allowanceSpent = categoryTotals['Allowance'] || 0;
    const essentialsSpent = categoryTotals['Essentials'] || 0;
    const extraSpent = categoryTotals['Extra'] || 0;

    const currentTopup = allowanceTopups.find(topup => topup.remaining > 0) || allowanceTopups[0];
    const avgDaysLasted = allowanceTopups
      .filter(topup => topup.daysLasted > 0)
      .reduce((sum, topup, _, arr) => sum + topup.daysLasted / arr.length, 0);

    const totalTopupAmount = allowanceTopups.reduce((sum, topup) => sum + topup.amount, 0);
    const avgTopupAmount = allowanceTopups.length > 0 ? totalTopupAmount / allowanceTopups.length : 0;

    const summaryData = {
      allowance: {
        budget: user.allowanceAmount,
        spent: allowanceSpent,
        remaining: user.allowanceAmount - allowanceSpent,
        frequency: user.allowanceFrequency
      },
      allowanceTopups: {
        current: currentTopup ? {
          amount: currentTopup.amount,
          spent: currentTopup.spent,
          remaining: currentTopup.remaining,
          daysLasted: currentTopup.daysLasted,
          receivedDate: currentTopup.receivedDate || currentTopup.createdAt
        } : null,
        avgDaysLasted: Math.round(avgDaysLasted * 10) / 10,
        avgAmount: Math.round(avgTopupAmount),
        totalTopups: allowanceTopups.length,
        recentTopups: allowanceTopups.slice(0, 3).map(topup => ({
          amount: topup.amount,
          daysLasted: topup.daysLasted,
          spent: topup.spent,
          date: topup.receivedDate || topup.createdAt
        }))
      },
      essentials: {
        budget: totalEssentials,
        spent: essentialsSpent,
        items: essentials.map(e => ({ name: e.name, amount: e.amount }))
      },
      extra: {
        spent: extraSpent
      },
      recentTransactions: transactions.slice(0, 10).map(t => ({
        amount: t.amount,
        description: t.description,
        category: t.category,
        date: t.date
      }))
    };

    let aiAdvice;

    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
      try {
        const prompt = `Analyze this student's financial data and provide comprehensive money-saving advice:

ALLOWANCE PATTERN ANALYSIS:
${summaryData.allowanceTopups.current ? `
Current Allowance: ₹${summaryData.allowanceTopups.current.amount} (₹${summaryData.allowanceTopups.current.remaining} remaining)
- Received: ${new Date(summaryData.allowanceTopups.current.receivedDate).toLocaleDateString()}
- Days lasted so far: ${summaryData.allowanceTopups.current.daysLasted || 'Still active'}
` : 'No active allowance topup'}

SPENDING PATTERNS:
- Average allowance amount: ₹${summaryData.allowanceTopups.avgAmount}
- Average days allowance lasts: ${summaryData.allowanceTopups.avgDaysLasted} days
- Total allowance topups: ${summaryData.allowanceTopups.totalTopups}

Recent Allowance History:
${summaryData.allowanceTopups.recentTopups.map(topup =>
  `- ₹${topup.amount} lasted ${topup.daysLasted || 'ongoing'} days (spent ₹${topup.spent})`
).join('\n')}

MONTHLY FIXED EXPENSES:
- Total essentials budget: ₹${summaryData.essentials.budget}
- Spent this period: ₹${summaryData.essentials.spent}
- Items: ${summaryData.essentials.items.map(i => `${i.name} (₹${i.amount})`).join(', ')}

EXTRA SPENDING: ₹${summaryData.extra.spent}

RECENT TRANSACTIONS:
${summaryData.recentTransactions.map(t => `- ₹${t.amount} on ${t.description} (${t.category})`).join('\n')}

Based on this data, provide:
1. Analysis of spending patterns and allowance duration trends
2. Specific recommendations to make allowances last longer
3. Suggested daily spending limits to extend allowance duration
4. Recommended savings amount per allowance topup
5. Actionable tips to reduce unnecessary expenses
6. Warning signs to watch for overspending

Make it practical and specific to this student's pattern of receiving ₹300-500 allowances every 3-4 days.`;

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert financial advisor specializing in student allowance management. Analyze spending patterns, allowance duration trends, and provide actionable money-saving strategies. Focus on practical daily habits that can extend allowance duration and build better spending discipline.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 600,
          temperature: 0.7
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        aiAdvice = response.data.choices[0].message.content;
      } catch (error) {
        console.error('OpenAI API error:', error.response?.data || error.message);
        aiAdvice = 'AI advice is currently unavailable. Please check your API configuration.';
      }
    } else {
      const tips = [
        'Track your daily expenses to identify spending patterns and areas where you can cut back.',
        'Set aside a small emergency fund from your allowance for unexpected expenses.',
        'Consider cooking at home more often instead of eating out to save on food costs.'
      ];

      // Allowance duration analysis
      if (summaryData.allowanceTopups.avgDaysLasted > 0) {
        if (summaryData.allowanceTopups.avgDaysLasted < 3) {
          tips.push(`Your allowances typically last ${summaryData.allowanceTopups.avgDaysLasted} days. Try to extend this to 4-5 days by reducing daily spending by ₹20-30.`);
        } else if (summaryData.allowanceTopups.avgDaysLasted > 4) {
          tips.push(`Great job! Your allowances last ${summaryData.allowanceTopups.avgDaysLasted} days on average. Consider saving ₹50 from each topup.`);
        }
      }

      // Current allowance warnings
      if (summaryData.allowanceTopups.current) {
        const dailySpendRate = summaryData.allowanceTopups.current.spent / (summaryData.allowanceTopups.current.daysLasted || 1);
        const projectedDays = summaryData.allowanceTopups.current.remaining / dailySpendRate;

        if (projectedDays < 1) {
          tips.push('⚠️ At your current spending rate, this allowance will be depleted soon! Consider reducing today\'s expenses.');
        } else if (projectedDays < 2) {
          tips.push(`💡 This allowance might last ${Math.round(projectedDays)} more day(s). Try to limit spending to ₹${Math.round(dailySpendRate * 0.8)} per day.`);
        }
      }

      if (summaryData.extra.spent > summaryData.allowanceTopups.avgAmount * 0.3) {
        tips.push('Your extra spending is quite high compared to your average allowance. Consider if these purchases are truly necessary.');
      }

      aiAdvice = `📊 SPENDING ANALYSIS:\n${summaryData.allowanceTopups.avgDaysLasted > 0 ?
        `• Your allowances typically last ${summaryData.allowanceTopups.avgDaysLasted} days\n• Average allowance amount: ₹${summaryData.allowanceTopups.avgAmount}\n• Daily spending rate: ₹${Math.round(summaryData.allowanceTopups.avgAmount / summaryData.allowanceTopups.avgDaysLasted)}\n\n` :
        '• Add more allowance data to see spending patterns\n\n'
      }💡 MONEY-SAVING TIPS:\n\n${tips.slice(0, 4).map((tip, i) => `${i + 1}. ${tip}`).join('\n\n')}`;
    }

    res.json({
      advice: aiAdvice,
      summary: summaryData
    });
  } catch (error) {
    console.error('Get advice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/chat', auth, async (req, res) => {
  try {
    const { message, chatHistory = [] } = req.body;

    // Enhanced question classification for better AI training
    const classifyQuestion = (msg) => {
      const lower = msg.toLowerCase();
      return {
        type: lower.includes('save') || lower.includes('saving') ? 'savings' :
              lower.includes('budget') || lower.includes('plan') ? 'budgeting' :
              lower.includes('emergency') || lower.includes('urgent') || lower.includes('help') ? 'emergency' :
              lower.includes('last') || lower.includes('extend') || lower.includes('days') ? 'duration' :
              lower.includes('goal') || lower.includes('target') ? 'goal' :
              lower.includes('food') || lower.includes('essential') ? 'essentials' :
              'general',
        intent: lower.includes('how') ? 'how-to' :
                lower.includes('should') || lower.includes('what') ? 'advice' :
                lower.includes('can') || lower.includes('will') ? 'possibility' :
                'question',
        urgency: lower.includes('urgent') || lower.includes('emergency') || lower.includes('crisis') ? 'high' :
                 lower.includes('soon') || lower.includes('quickly') ? 'medium' : 'low'
      };
    };

    const questionData = classifyQuestion(message);

    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Message is required' });
    }

    const user = await User.findById(req.user._id);
    const essentials = await Essential.find({ userId: req.user._id, isActive: true });
    const allowanceTopups = await AllowanceTopup.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(5);

    const now = new Date();
    let periodStart, periodEnd;

    if (user.allowanceFrequency === 'weekly') {
      const dayOfWeek = now.getDay();
      const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      periodEnd = new Date(now);
      periodEnd.setDate(now.getDate() + daysToSunday);
      periodEnd.setHours(23, 59, 59, 999);

      periodStart = new Date(periodEnd);
      periodStart.setDate(periodEnd.getDate() - 6);
      periodStart.setHours(0, 0, 0, 0);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const transactions = await Transaction.find({
      userId: req.user._id,
      type: 'expense',
      date: { $gte: periodStart, $lte: periodEnd }
    }).sort({ date: -1 });

    const categoryTotals = transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    const totalEssentials = essentials.reduce((sum, e) => sum + e.amount, 0);
    const allowanceSpent = categoryTotals['Allowance'] || 0;
    const essentialsSpent = categoryTotals['Essentials'] || 0;
    const extraSpent = categoryTotals['Extra'] || 0;

    const currentTopup = allowanceTopups.find(topup => topup.remaining > 0) || allowanceTopups[0];
    const avgDaysLasted = allowanceTopups
      .filter(topup => topup.daysLasted > 0)
      .reduce((sum, topup, _, arr) => sum + topup.daysLasted / arr.length, 0);

    const avgTopupAmount = allowanceTopups.length > 0 ?
      allowanceTopups.reduce((sum, topup) => sum + topup.amount, 0) / allowanceTopups.length : 0;

    // Get ALL recent transactions for comprehensive analysis
    const allRecentTransactions = await Transaction.find({
      userId: req.user._id,
      type: 'expense',
      date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }).sort({ date: -1 });

    // Analyze expense patterns for detailed context
    let expenseAnalysis = '';
    let predictionContext = '';

    try {
      // Detailed expense pattern analysis
      const expensesByDescription = {};
      const expensesByCategory = { Allowance: 0, Essentials: 0, Extra: 0 };
      const expensesByDay = {};
      const recentExpenses = allRecentTransactions.slice(0, 20);

      // Analyze expense patterns
      allRecentTransactions.forEach(transaction => {
        // Group by description for spending habits
        const desc = transaction.description.toLowerCase();
        if (!expensesByDescription[desc]) {
          expensesByDescription[desc] = { count: 0, total: 0, avgAmount: 0 };
        }
        expensesByDescription[desc].count++;
        expensesByDescription[desc].total += transaction.amount;
        expensesByDescription[desc].avgAmount = expensesByDescription[desc].total / expensesByDescription[desc].count;

        // Category totals
        expensesByCategory[transaction.category] += transaction.amount;

        // Daily patterns
        const dayName = transaction.date.toLocaleDateString('en-IN', { weekday: 'short' });
        if (!expensesByDay[dayName]) expensesByDay[dayName] = 0;
        expensesByDay[dayName] += transaction.amount;
      });

      // Find top spending categories and habits
      const topExpenses = Object.entries(expensesByDescription)
        .filter(([desc, data]) => data.count >= 2) // At least 2 occurrences
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);

      const highestSpendingDay = Object.entries(expensesByDay)
        .sort((a, b) => b[1] - a[1])[0];

      expenseAnalysis = `
DETAILED EXPENSE ANALYSIS (Last 30 days):

SPENDING HABITS:
${topExpenses.map(([desc, data]) =>
  `• ${desc}: ${data.count}x spent, ₹${Math.round(data.total)} total (avg ₹${Math.round(data.avgAmount)} each)`
).join('\n')}

CATEGORY BREAKDOWN:
- Allowance spending: ₹${Math.round(expensesByCategory.Allowance)} (${Math.round((expensesByCategory.Allowance/(expensesByCategory.Allowance + expensesByCategory.Essentials + expensesByCategory.Extra))*100)}%)
- Essential bills: ₹${Math.round(expensesByCategory.Essentials)}
- Extra purchases: ₹${Math.round(expensesByCategory.Extra)}

DAY-WISE PATTERN:
- Highest spending day: ${highestSpendingDay ? `${highestSpendingDay[0]} (₹${Math.round(highestSpendingDay[1])})` : 'Not enough data'}
- Monday-Friday avg: ₹${Math.round((expensesByDay.Mon + expensesByDay.Tue + expensesByDay.Wed + expensesByDay.Thu + expensesByDay.Fri) / 5) || 0}
- Weekend avg: ₹${Math.round((expensesByDay.Sat + expensesByDay.Sun) / 2) || 0}

RECENT SPENDING PATTERN:
${recentExpenses.slice(0, 10).map(t =>
  `• ₹${t.amount} on ${t.description} (${t.category}) - ${new Date(t.date).toLocaleDateString()}`
).join('\n')}`;

      // Get prediction data (force restart)
      if (currentTopup) {
        // Get historical topups for prediction
        const historicalTopups = await AllowanceTopup.find({
          userId: req.user._id,
          daysLasted: { $gt: 0 }
        }).sort({ createdAt: -1 }).limit(10);

        const predictionData = calculateAllowancePredictions(currentTopup, allRecentTransactions, historicalTopups);
        predictionContext = `
ALLOWANCE DURATION PREDICTION:
- Predicted days remaining: ${predictionData.predictions.weighted} days
- Confidence level: ${predictionData.confidence}%
- Current daily spending rate: ₹${predictionData.dailyRates.current}
- Recent 3-day average: ₹${predictionData.dailyRates.recent3day}
- Weekend vs weekday spending: ₹${predictionData.dailyRates.weekend} vs ₹${predictionData.dailyRates.weekday}
`;
      }
    } catch (error) {
      console.error('Expense analysis error:', error);
      expenseAnalysis = 'Unable to analyze expense patterns at the moment.';
    }

    const contextPrompt = `You are Pocketa's AI financial advisor, specializing in Indian student finances. Your role is to provide logical, actionable solutions based on real data.

TRAINING PRINCIPLES:
1. ALWAYS provide specific, actionable advice with exact amounts and timeframes
2. Use the financial data to support your recommendations with logical reasoning
3. Offer step-by-step solutions that the student can implement immediately
4. When suggesting spending cuts, specify exactly what to reduce and by how much
5. Provide alternative solutions when one approach might not work
6. Reference the prediction data to create urgency or reassurance as appropriate
7. ANALYZE SPENDING HABITS and suggest specific cuts based on their actual expense patterns

RESPONSE TRAINING FRAMEWORK:
- For SAVINGS questions: Focus on specific rupee amounts and daily habits
- For BUDGETING questions: Create realistic daily/weekly spending limits
- For EMERGENCY questions: Provide immediate crisis management steps
- For DURATION questions: Use mathematical predictions with their spending patterns
- For GENERAL questions: Always connect back to their actual financial data
- For GOAL-SETTING questions: Create achievable milestones with deadlines

COMMUNICATION STYLE:
- Use simple, clear language (student-friendly)
- Include emoji sparingly for clarity (💡 for tips, ⚠️ for warnings, ✅ for achievements)
- Reference their actual spending amounts: "Based on your ₹X spending on Y..."
- Always explain WHY behind each recommendation
- Use encouraging tone while being realistic about financial constraints

STUDENT'S CURRENT FINANCIAL SITUATION:

CURRENT ALLOWANCE STATUS:
${currentTopup ? `
- Total allowance: ₹${currentTopup.amount}
- Money remaining: ₹${currentTopup.remaining}
- Already spent: ₹${currentTopup.spent}
- Days active: ${currentTopup.daysLasted || Math.ceil((new Date() - currentTopup.createdAt) / (1000 * 60 * 60 * 24))} days
- Received on: ${new Date(currentTopup.receivedDate || currentTopup.createdAt).toLocaleDateString()}
` : 'No active allowance (urgent: student needs to request money)'}

${predictionContext}

${expenseAnalysis}

HISTORICAL SPENDING BEHAVIOR:
- Typical allowance amount: ₹${Math.round(avgTopupAmount)}
- Average allowance duration: ${Math.round(avgDaysLasted * 10) / 10} days
- Total allowances tracked: ${allowanceTopups.length}
- Pattern reliability: ${allowanceTopups.length >= 3 ? 'High (reliable data)' : 'Low (need more data)'}

CURRENT MONTH EXPENSES:
- Allowance category spending: ₹${allowanceSpent}
- Essential bills paid: ₹${essentialsSpent}
- Extra purchases: ₹${extraSpent}
- Total monthly spending: ₹${allowanceSpent + essentialsSpent + extraSpent}

FIXED COMMITMENTS (Monthly):
- Total essential bills: ₹${totalEssentials}
- Items: ${essentials.map(e => `${e.name} (₹${e.amount})`).join(', ') || 'None set up'}

RESPONSE REQUIREMENTS:
- Give specific amounts, not vague suggestions
- Explain the logic behind each recommendation
- Provide immediate actionable steps based on their ACTUAL spending habits
- Use the prediction data to create appropriate urgency
- Suggest specific expense categories to cut based on their spending patterns
- Reference their top spending habits when making recommendations
- Address the student's specific question with their actual expense data

CURRENT QUESTION ANALYSIS:
- Question Type: ${questionData.type}
- Intent: ${questionData.intent}
- Urgency Level: ${questionData.urgency}
- User Question: "${message}"

SPECIALIZED RESPONSE TRAINING:
${questionData.type === 'savings' ? `
SAVINGS FOCUS: Provide specific daily/weekly savings targets. Use their spending data to identify exact cuts.
Format: "Cut ₹X from Y category = Save ₹Z per week = ₹${questionData.urgency === 'high' ? 'immediate impact' : 'monthly goal'}"
` : ''}${questionData.type === 'budgeting' ? `
BUDGET FOCUS: Create realistic daily spending limits based on their allowance pattern.
Format: "Daily limit: ₹X (₹Y for essentials + ₹Z discretionary) = ${questionData.urgency === 'high' ? 'extends current allowance' : 'sustainable long-term'}"
` : ''}${questionData.type === 'emergency' ? `
EMERGENCY FOCUS: Immediate actionable steps for financial crisis management.
Format: "Immediate: Step 1, 2, 3. Today: ₹X available. Tomorrow: Plan Y. This week: Goal Z"
` : ''}${questionData.type === 'duration' ? `
DURATION FOCUS: Mathematical prediction-based advice using their actual spending rates.
Format: "Current rate: ₹X/day. To last Y days: Reduce to ₹Z/day. Specific cuts: [list]"
` : ''}${questionData.urgency === 'high' ? `
HIGH URGENCY: Provide immediate, actionable solutions. Skip long explanations. Focus on what they can do TODAY.
` : ''}`;

    let aiResponse;

    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
      try {
        const messages = [
          {
            role: 'system',
            content: contextPrompt
          },
          ...chatHistory.slice(-6), // Keep last 6 messages for context
          {
            role: 'user',
            content: message
          }
        ];

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 400,
          temperature: 0.8
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        aiResponse = response.data.choices[0].message.content;
      } catch (error) {
        console.error('OpenAI API error:', error.response?.data || error.message);
        aiResponse = 'I\'m having trouble connecting to my AI assistant right now. Please try again in a moment.';
      }
    } else {
      // Enhanced intelligent fallback responses
      const lowerMessage = message.toLowerCase();

      // Get prediction data and expense analysis for smart responses
      let predictionData = null;
      let expenseInsights = {};

      try {
        if (currentTopup) {
          // Get historical topups for prediction in fallback mode
          const historicalTopups = await AllowanceTopup.find({
            userId: req.user._id,
            daysLasted: { $gt: 0 }
          }).sort({ createdAt: -1 }).limit(10);

          predictionData = calculateAllowancePredictions(currentTopup, allRecentTransactions, historicalTopups);
        }

        // Analyze recent expenses for patterns
        const expensesByDescription = {};
        allRecentTransactions.forEach(transaction => {
          const desc = transaction.description.toLowerCase();
          if (!expensesByDescription[desc]) {
            expensesByDescription[desc] = { count: 0, total: 0 };
          }
          expensesByDescription[desc].count++;
          expensesByDescription[desc].total += transaction.amount;
        });

        // Find top 3 expense categories
        expenseInsights.topExpenses = Object.entries(expensesByDescription)
          .filter(([desc, data]) => data.count >= 2)
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 3);

        // Calculate food vs transport vs other spending
        // Only analyze discretionary expenses from Allowance category
        const allowanceOnlyTransactions = allRecentTransactions.filter(t => t.category === 'Allowance');
        expenseInsights.categories = {
          food: allowanceOnlyTransactions.filter(t =>
            t.description.toLowerCase().includes('food') ||
            t.description.toLowerCase().includes('lunch') ||
            t.description.toLowerCase().includes('snack') ||
            t.description.toLowerCase().includes('tea') ||
            t.description.toLowerCase().includes('coffee')
          ).reduce((sum, t) => sum + t.amount, 0),
          transport: allowanceOnlyTransactions.filter(t =>
            t.description.toLowerCase().includes('bus') ||
            t.description.toLowerCase().includes('auto') ||
            t.description.toLowerCase().includes('transport') ||
            t.description.toLowerCase().includes('uber') ||
            t.description.toLowerCase().includes('metro')
          ).reduce((sum, t) => sum + t.amount, 0),
          entertainment: allowanceOnlyTransactions.filter(t =>
            t.description.toLowerCase().includes('movie') ||
            t.description.toLowerCase().includes('game') ||
            t.description.toLowerCase().includes('entertainment')
          ).reduce((sum, t) => sum + t.amount, 0)
        };

      } catch (error) {
        console.error('Expense insights error in fallback:', error);
      }

      // Smart AI that handles any financial question intelligently using classification
      if (!currentTopup || !predictionData) {
        // Provide specific guidance based on question type even without data
        switch(questionData.type) {
          case 'emergency':
            aiResponse = `🚨 **FINANCIAL EMERGENCY HELP**\n\n**Immediate steps:**\n1. Add your current allowance in the app first\n2. List all essential expenses (rent, food, transport)\n3. Calculate emergency fund needed\n4. Contact family/friends for support if needed\n\nOnce you add your financial data, I can provide specific crisis management advice with exact amounts and timelines.`;
            break;
          case 'savings':
            aiResponse = `💰 **SAVINGS STRATEGY**\n\nTo give you specific savings advice, I need your allowance data first:\n\n**Add to the app:**\n• Current allowance amount\n• Daily/weekly expenses\n• Essential vs discretionary spending\n\n**Then I can help with:**\n• Exact daily savings targets (₹X per day)\n• Specific spending cuts to reach your goals\n• Emergency fund building strategies\n\nClick 'Manage Budget' to get started!`;
            break;
          case 'budgeting':
            aiResponse = `📊 **BUDGET PLANNING**\n\nI'll create a personalized budget once you add your data:\n\n**Need from you:**\n• Monthly allowance amount\n• Essential expenses (food, transport, etc.)\n• Spending history\n\n**I'll provide:**\n• Daily spending limits\n• Category-wise budget breakdown\n• Realistic financial targets\n\nStart by adding your current allowance!`;
            break;
          default:
            aiResponse = `I can help with any financial question! Add your current allowance data first, then ask me anything about:\n• Budgeting and planning\n• Saving strategies\n• Expense tracking\n• Emergency financial help\n• Investment basics\n• Money management tips\n\nI'll give specific advice based on your actual spending data.`;
        }
      } else {
        const context = {
          remaining: currentTopup.remaining,
          daysLeft: predictionData.predictions.weighted,
          dailyRate: predictionData.dailyRates.current,
          avgAmount: avgTopupAmount,
          avgDuration: avgDaysLasted,
          essentialBills: totalEssentials
        };

        // Intelligent question analysis
        if (lowerMessage.includes('save') || lowerMessage.includes('saving') || lowerMessage.includes('money') ||
            lowerMessage.includes('₹') || lowerMessage.includes('rupees') || lowerMessage.includes('hundred')) {

          // Extract specific amount if mentioned
          const amountMatch = lowerMessage.match(/₹?(\d+)/);
          const targetSavings = amountMatch ? parseInt(amountMatch[1]) : Math.round(context.avgAmount * 0.15);

          aiResponse = `**SAVINGS STRATEGY:**\n\n`;
          aiResponse += `Current situation: ₹${context.remaining} left, predicted to last ${context.daysLeft} days\n\n`;

          if (expenseInsights?.categories) {
            aiResponse += `**Your best savings opportunities:**\n`;
            Object.entries(expenseInsights.categories).forEach(([category, amount]) => {
              if (amount > 20) {
                const savings = Math.round(amount * 0.4);
                aiResponse += `• ${category}: Cut by 40% to save ₹${savings}\n`;
              }
            });
          }

          const newDailyRate = Math.round(context.dailyRate * 0.8);
          aiResponse += `\n**Daily action plan:**\n`;
          aiResponse += `1. Reduce daily spending from ₹${context.dailyRate} to ₹${newDailyRate}\n`;
          aiResponse += `2. This saves ₹${context.dailyRate - newDailyRate}/day = ₹${(context.dailyRate - newDailyRate) * context.daysLeft} total\n`;
          aiResponse += `3. Target achieved: ₹${targetSavings} saved by end of allowance\n\n`;
          aiResponse += `**Logic:** Lower daily spending extends allowance AND creates savings for emergencies.`;

        } else if (lowerMessage.includes('last longer') || lowerMessage.includes('extend') || lowerMessage.includes('stretch') ||
                   lowerMessage.includes('days') || lowerMessage.includes('duration')) {

          const targetDays = Math.max(context.daysLeft + 2, 5);
          const newDailyLimit = Math.round(context.remaining / targetDays);

          aiResponse = `**EXTEND ALLOWANCE PLAN:**\n\n`;
          aiResponse += `Current rate: ₹${context.dailyRate}/day → ${context.daysLeft} days left\n`;
          aiResponse += `Target: ${targetDays} days\n\n`;
          aiResponse += `**Step-by-step solution:**\n`;
          aiResponse += `1. New daily limit: ₹${newDailyLimit} (down from ₹${context.dailyRate})\n`;
          aiResponse += `2. Daily savings needed: ₹${context.dailyRate - newDailyLimit}\n`;
          aiResponse += `3. Track daily: Use app to log every expense\n\n`;
          aiResponse += `**Why this works:** Reducing spending by ${Math.round(((context.dailyRate - newDailyLimit)/context.dailyRate)*100)}% extends duration by ${targetDays - context.daysLeft} days`;

        } else if (lowerMessage.includes('budget') || lowerMessage.includes('plan') || lowerMessage.includes('manage') ||
                   lowerMessage.includes('organize') || lowerMessage.includes('control')) {

          const dailyBudget = Math.round(context.avgAmount / context.avgDuration);
          const essentialDaily = Math.round(context.essentialBills / 30);
          const discretionaryBudget = dailyBudget - essentialDaily;

          aiResponse = `**PERSONALIZED BUDGET PLAN:**\n\n`;
          aiResponse += `Based on your ₹${context.avgAmount} allowances lasting ${context.avgDuration} days:\n\n`;
          aiResponse += `**Daily breakdown:**\n`;
          aiResponse += `• Essential bills: ₹${essentialDaily}/day (₹${context.essentialBills}/month)\n`;
          aiResponse += `• Discretionary spending: ₹${discretionaryBudget}/day\n`;
          aiResponse += `• Emergency buffer: ₹${Math.round(dailyBudget * 0.1)}/day\n\n`;
          aiResponse += `**Implementation:** Set daily phone reminders and track in this app`;

        } else if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent') || lowerMessage.includes('crisis') ||
                   lowerMessage.includes('help') || lowerMessage.includes('problem')) {

          aiResponse = `**FINANCIAL EMERGENCY PROTOCOL:**\n\n`;
          aiResponse += `Available funds: ₹${context.remaining}\n\n`;
          aiResponse += `**Immediate steps:**\n`;
          aiResponse += `1. Define the emergency expense amount\n`;
          aiResponse += `2. If > ₹${context.remaining}: Contact parents/family immediately\n`;
          aiResponse += `3. If ≤ ₹${context.remaining}: Use allowance but reduce other spending afterward\n`;
          aiResponse += `4. Document the emergency expense in app\n`;
          aiResponse += `5. Plan recovery: Request additional allowance\n\n`;
          aiResponse += `**Prevention:** Build ₹${Math.round(context.avgAmount * 0.15)} emergency fund from each allowance`;

        } else if (lowerMessage.includes('essential') || lowerMessage.includes('need') || lowerMessage.includes('monthly') ||
                   lowerMessage.includes('4200') || lowerMessage.includes('food')) {

          aiResponse = `**UNDERSTANDING YOUR ESSENTIALS:**\n\n`;
          aiResponse += `You're absolutely right - food is essential! Let me adjust my recommendations:\n\n`;
          aiResponse += `**Focus on discretionary allowance spending instead:**\n`;

          if (expenseInsights?.categories) {
            Object.entries(expenseInsights.categories).forEach(([category, amount]) => {
              if (amount > 20 && category !== 'food') {
                aiResponse += `• ${category}: Reduce by 30% to save ₹${Math.round(amount * 0.3)}\n`;
              }
            });
          }

          aiResponse += `\n**Realistic daily allowance cuts:**\n`;
          aiResponse += `1. Reduce from ₹${context.dailyRate} to ₹${Math.round(context.dailyRate * 0.85)} per day (-15%)\n`;
          aiResponse += `2. Focus on convenience items, not essential meals\n`;
          aiResponse += `3. This will extend your allowance by ${Math.round(context.daysLeft * 0.18)} extra days\n\n`;
          aiResponse += `**Your ₹4,200 monthly food budget should stay protected** - these cuts target discretionary allowance spending only.`;

        } else {
          // General intelligent response
          aiResponse = `**PERSONALIZED FINANCIAL ADVICE:**\n\n`;
          aiResponse += `Your current status: ₹${context.remaining} remaining, ${context.daysLeft} days predicted\n\n`;

          if (lowerMessage.includes('advice') || lowerMessage.includes('suggest') || lowerMessage.includes('recommend')) {
            aiResponse += `**Based on your spending pattern:**\n`;
            aiResponse += `• Average allowance: ₹${context.avgAmount} lasting ${context.avgDuration} days\n`;
            aiResponse += `• Current daily rate: ₹${context.dailyRate}\n`;
            aiResponse += `• Essential bills: ₹${context.essentialBills}/month\n\n`;

            aiResponse += `**My recommendations:**\n`;
            if (context.daysLeft <= 3) {
              aiResponse += `1. URGENT: Limit spending to ₹${Math.round(context.remaining/2)}/day for next 2 days\n`;
              aiResponse += `2. Plan your next allowance request (suggest ₹${context.avgAmount})\n`;
            } else {
              aiResponse += `1. Maintain current pace but track daily expenses\n`;
              aiResponse += `2. Try to save ₹${Math.round(context.dailyRate * 0.1)}/day for emergencies\n`;
            }
            aiResponse += `3. Set up essential vs discretionary spending categories\n`;
            aiResponse += `4. Use this app daily to track and predict spending\n\n`;
          }

          aiResponse += `**Ask me specific questions like:**\n`;
          aiResponse += `• "How can I make this last 7 days?"\n`;
          aiResponse += `• "What should I spend on weekends?"\n`;
          aiResponse += `• "Help me plan my monthly budget"\n`;
          aiResponse += `• "Should I ask for more money?"\n\n`;
          aiResponse += `I'll analyze your data and give you exact amounts and step-by-step plans.`;
        }
      }
    }

    // Log conversation for AI improvement (optional - can be disabled for privacy)
    try {
      console.log('AI Training Log:', {
        userId: req.user._id,
        question: message,
        questionType: questionData.type,
        questionIntent: questionData.intent,
        urgency: questionData.urgency,
        hasData: !!currentTopup,
        responseLength: aiResponse.length,
        timestamp: new Date()
      });
    } catch (logError) {
      // Silent fail for logging
    }

    res.json({
      response: aiResponse,
      timestamp: new Date(),
      context: {
        currentBalance: currentTopup?.remaining || 0,
        avgDaysLasted: Math.round(avgDaysLasted * 10) / 10,
        avgTopupAmount: Math.round(avgTopupAmount)
      },
      // Include classification for frontend debugging (remove in production)
      debug: {
        questionType: questionData.type,
        intent: questionData.intent,
        urgency: questionData.urgency
      }
    });

  } catch (error) {
    console.error('Chat advice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/monthly-analysis', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    // Get all allowance transactions for the year
    const allowanceTransactions = await Transaction.find({
      userId: req.user._id,
      type: 'expense',
      category: 'Allowance',
      date: { $gte: startOfYear, $lte: endOfYear }
    }).sort({ date: 1 });

    // Get all allowance topups for the year
    const allowanceTopups = await AllowanceTopup.find({
      userId: req.user._id,
      createdAt: { $gte: startOfYear, $lte: endOfYear }
    }).sort({ createdAt: 1 });

    // Calculate monthly data
    const monthlyData = [];

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

      // Get allowance transactions for this month
      const monthTransactions = allowanceTransactions.filter(t =>
        t.date >= monthStart && t.date <= monthEnd
      );

      // Get allowance topups for this month
      const monthTopups = allowanceTopups.filter(t =>
        t.createdAt >= monthStart && t.createdAt <= monthEnd
      );

      const totalReceived = monthTopups.reduce((sum, topup) => sum + topup.amount, 0);
      const totalSpent = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalSaved = totalReceived - totalSpent;

      monthlyData.push({
        month: month + 1,
        monthName: new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long' }),
        totalReceived,
        totalSpent,
        totalSaved,
        topupsCount: monthTopups.length,
        transactionsCount: monthTransactions.length,
        avgTopupAmount: monthTopups.length > 0 ? totalReceived / monthTopups.length : 0,
        dailyAvgSpent: totalSpent / new Date(year, month + 1, 0).getDate(),
        transactions: monthTransactions.slice(0, 5).map(t => ({
          amount: t.amount,
          description: t.description,
          date: t.date
        }))
      });
    }

    // Calculate year summary
    const yearSummary = {
      totalReceived: monthlyData.reduce((sum, month) => sum + month.totalReceived, 0),
      totalSpent: monthlyData.reduce((sum, month) => sum + month.totalSpent, 0),
      totalSaved: monthlyData.reduce((sum, month) => sum + month.totalSaved, 0),
      totalTopups: monthlyData.reduce((sum, month) => sum + month.topupsCount, 0),
      avgMonthlySpending: monthlyData.reduce((sum, month) => sum + month.totalSpent, 0) / 12,
      avgMonthlySavings: monthlyData.reduce((sum, month) => sum + month.totalSaved, 0) / 12,
      bestSavingMonth: monthlyData.reduce((best, month) =>
        month.totalSaved > best.totalSaved ? month : best, monthlyData[0]
      ),
      highestSpendingMonth: monthlyData.reduce((highest, month) =>
        month.totalSpent > highest.totalSpent ? month : highest, monthlyData[0]
      )
    };

    res.json({
      year: parseInt(year),
      monthlyData,
      yearSummary
    });

  } catch (error) {
    console.error('Monthly analysis error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/prediction', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Get current active allowance
    const currentTopup = await AllowanceTopup.findOne({
      userId: req.user._id,
      remaining: { $gt: 0 }
    }).sort({ createdAt: -1 });

    if (!currentTopup) {
      return res.json({
        prediction: null,
        message: 'No active allowance found'
      });
    }

    // Get recent allowance transactions for current topup
    const recentTransactions = await Transaction.find({
      userId: req.user._id,
      type: 'expense',
      category: 'Allowance',
      date: { $gte: currentTopup.createdAt }
    }).sort({ date: -1 });

    // Get ALL recent transactions for comprehensive analysis
    const allRecentTransactions = await Transaction.find({
      userId: req.user._id,
      type: 'expense',
      date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }).sort({ date: -1 });

    // Get historical allowance topups for pattern analysis
    const historicalTopups = await AllowanceTopup.find({
      userId: req.user._id,
      daysLasted: { $gt: 0 }
    }).sort({ createdAt: -1 }).limit(10);

    // Calculate predictions using multiple methods
    const predictions = calculateAllowancePredictions(
      currentTopup,
      recentTransactions,
      historicalTopups
    );

    console.log('DEBUG - Prediction calculation result:', JSON.stringify(predictions, null, 2));

    res.json({
      currentTopup: {
        amount: currentTopup.amount,
        remaining: currentTopup.remaining,
        spent: currentTopup.spent,
        daysActive: currentTopup.daysLasted || Math.ceil((new Date() - currentTopup.createdAt) / (1000 * 60 * 60 * 24))
      },
      predictions,
      confidence: predictions.confidence,
      recommendations: generatePredictionRecommendations(predictions, currentTopup)
    });

  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Prediction calculation logic
function calculateAllowancePredictions(currentTopup, recentTransactions, historicalTopups) {
  const now = new Date();
  const daysActive = Math.max(1, Math.ceil((now - currentTopup.createdAt) / (1000 * 60 * 60 * 24)));

  console.log('DEBUG - Calculation inputs:', {
    currentTopup: { amount: currentTopup.amount, spent: currentTopup.spent, remaining: currentTopup.remaining },
    daysActive,
    recentTransactionsCount: recentTransactions.length,
    historicalTopupsCount: historicalTopups.length
  });

  // Method 1: Current spending rate
  const currentDailyRate = daysActive > 0 ? currentTopup.spent / daysActive : 0;
  const currentRatePrediction = currentDailyRate > 0 ? Math.floor(currentTopup.remaining / currentDailyRate) : 999;

  console.log('DEBUG - Method 1 (Current rate):', { currentDailyRate, currentRatePrediction });

  // Method 2: Recent 3-day average
  const recent3Days = recentTransactions.filter(t => {
    const daysDiff = (now - t.date) / (1000 * 60 * 60 * 24);
    return daysDiff <= 3;
  });
  const recent3DaySpent = recent3Days.reduce((sum, t) => sum + t.amount, 0);
  const recent3DayRate = recent3DaySpent / Math.min(3, daysActive);
  const recent3DayPrediction = recent3DayRate > 0 ? Math.floor(currentTopup.remaining / recent3DayRate) : 999;

  // Method 3: Historical average
  const historicalAvgDuration = historicalTopups.length > 0 ?
    historicalTopups.reduce((sum, topup) => sum + topup.daysLasted, 0) / historicalTopups.length : 0;
  const historicalAvgRate = historicalTopups.length > 0 ?
    historicalTopups.reduce((sum, topup) => sum + (topup.amount / topup.daysLasted), 0) / historicalTopups.length : 0;
  const historicalPrediction = historicalAvgRate > 0 ? Math.floor(currentTopup.remaining / historicalAvgRate) : 999;

  // Method 4: Weekend vs weekday pattern
  const weekdayTransactions = recentTransactions.filter(t => {
    const day = t.date.getDay();
    return day >= 1 && day <= 5; // Monday to Friday
  });
  const weekendTransactions = recentTransactions.filter(t => {
    const day = t.date.getDay();
    return day === 0 || day === 6; // Saturday and Sunday
  });

  const weekdayAvg = weekdayTransactions.length > 0 ?
    weekdayTransactions.reduce((sum, t) => sum + t.amount, 0) / weekdayTransactions.length : currentDailyRate;
  const weekendAvg = weekendTransactions.length > 0 ?
    weekendTransactions.reduce((sum, t) => sum + t.amount, 0) / weekendTransactions.length : currentDailyRate;

  // Calculate remaining weekdays and weekends
  const today = new Date();
  const remainingDays = 14; // Look ahead 2 weeks
  let weekdaysRemaining = 0;
  let weekendsRemaining = 0;

  for (let i = 0; i < remainingDays; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    const dayOfWeek = futureDate.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weekdaysRemaining++;
    } else {
      weekendsRemaining++;
    }
  }

  const patternBasedSpending = (weekdaysRemaining * weekdayAvg) + (weekendsRemaining * weekendAvg);
  const patternPrediction = patternBasedSpending > 0 ? Math.floor(currentTopup.remaining / (patternBasedSpending / remainingDays)) : 999;

  // Weighted average of predictions
  const predictions = [
    { method: 'current', value: currentRatePrediction, weight: 0.4 },
    { method: 'recent3day', value: recent3DayPrediction, weight: 0.3 },
    { method: 'historical', value: historicalPrediction, weight: 0.2 },
    { method: 'pattern', value: patternPrediction, weight: 0.1 }
  ].filter(p => p.value < 999);

  console.log('DEBUG - Valid predictions:', predictions);

  let weightedAverage;
  if (predictions.length > 0) {
    weightedAverage = predictions.reduce((sum, p) => sum + (p.value * p.weight), 0) / predictions.reduce((sum, p) => sum + p.weight, 0);
  } else {
    // Fallback: If no valid predictions, estimate based on a reasonable daily spending rate
    const fallbackDailyRate = Math.max(10, currentTopup.amount * 0.1); // At least ₹10/day or 10% of allowance
    weightedAverage = Math.floor(currentTopup.remaining / fallbackDailyRate);
    console.log('DEBUG - Using fallback prediction:', { fallbackDailyRate, weightedAverage });
  }

  // Confidence calculation
  const variance = predictions.length > 1 ?
    predictions.reduce((sum, p) => sum + Math.pow(p.value - weightedAverage, 2), 0) / predictions.length : 0;
  const standardDeviation = Math.sqrt(variance);
  const confidence = Math.max(0, Math.min(100, 100 - (standardDeviation / weightedAverage * 100)));

  return {
    predictions: {
      current: Math.max(0, Math.floor(currentRatePrediction)),
      recent3day: Math.max(0, Math.floor(recent3DayPrediction)),
      historical: Math.max(0, Math.floor(historicalPrediction)),
      pattern: Math.max(0, Math.floor(patternPrediction)),
      weighted: Math.max(0, Math.floor(weightedAverage))
    },
    confidence: Math.round(confidence),
    dailyRates: {
      current: Math.round(currentDailyRate),
      recent3day: Math.round(recent3DayRate),
      historical: Math.round(historicalAvgRate),
      weekday: Math.round(weekdayAvg),
      weekend: Math.round(weekendAvg)
    },
    historicalData: {
      avgDuration: Math.round(historicalAvgDuration * 10) / 10,
      totalTopups: historicalTopups.length
    }
  };
}

function generatePredictionRecommendations(predictions, currentTopup) {
  const recommendations = [];
  const daysLeft = predictions.predictions.weighted;
  const currentRate = predictions.dailyRates.current;

  if (daysLeft <= 1) {
    recommendations.push({
      type: 'urgent',
      message: '🚨 Your allowance will likely be depleted today! Consider asking for more or reducing expenses immediately.',
      action: 'Limit spending to emergency items only'
    });
  } else if (daysLeft <= 2) {
    recommendations.push({
      type: 'warning',
      message: `⚠️ Your allowance will last approximately ${daysLeft} more days. Plan accordingly.`,
      action: `Reduce daily spending to ₹${Math.round(currentTopup.remaining / 3)} to extend to 3 days`
    });
  } else if (daysLeft <= 3) {
    recommendations.push({
      type: 'caution',
      message: `💡 Your allowance will last about ${daysLeft} days. Consider moderating expenses.`,
      action: `Target daily spending of ₹${Math.round(currentTopup.remaining / 5)} to extend to 5 days`
    });
  } else if (daysLeft >= 7) {
    recommendations.push({
      type: 'good',
      message: `✅ Great job! Your allowance should last ${daysLeft}+ days at current spending rate.`,
      action: `Consider saving ₹${Math.round(currentRate * 0.2)} per day for future emergencies`
    });
  }

  // Spending pattern recommendations
  if (predictions.dailyRates.weekend > predictions.dailyRates.weekday * 1.5) {
    recommendations.push({
      type: 'insight',
      message: '📊 You spend significantly more on weekends. Plan weekend activities within budget.',
      action: `Try limiting weekend spending to ₹${Math.round(predictions.dailyRates.weekday * 1.2)}`
    });
  }

  if (predictions.confidence < 50) {
    recommendations.push({
      type: 'info',
      message: '📈 Spending patterns are irregular. Track expenses more consistently for better predictions.',
      action: 'Add expenses daily to improve prediction accuracy'
    });
  }

  return recommendations;
}

module.exports = router;