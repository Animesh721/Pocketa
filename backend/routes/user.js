const express = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Essential = require('../models/Essential');

const router = express.Router();

router.get('/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const essentials = await Essential.find({ userId: req.user._id, isActive: true });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        allowanceAmount: user.allowanceAmount,
        allowanceFrequency: user.allowanceFrequency,
        setupCompleted: user.setupCompleted
      },
      essentials
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/settings', auth, async (req, res) => {
  try {
    const { allowanceAmount, allowanceFrequency, essentials } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.allowanceAmount = allowanceAmount;
    user.allowanceFrequency = allowanceFrequency;
    user.setupCompleted = true;
    await user.save();

    await Essential.updateMany(
      { userId: req.user._id },
      { isActive: false }
    );

    if (essentials && essentials.length > 0) {
      // Filter out invalid essentials and ensure all fields are present
      const validEssentials = essentials.filter(essential =>
        essential.name &&
        essential.name.trim() !== '' &&
        essential.amount &&
        parseFloat(essential.amount) > 0 &&
        essential.dueDate &&
        parseInt(essential.dueDate) >= 1 &&
        parseInt(essential.dueDate) <= 31
      );

      if (validEssentials.length > 0) {
        const essentialDocs = validEssentials.map(essential => ({
          name: essential.name.trim(),
          amount: parseFloat(essential.amount),
          dueDate: parseInt(essential.dueDate),
          userId: req.user._id,
          isActive: true
        }));

        console.log('Saving essentials:', essentialDocs); // Debug log
        await Essential.insertMany(essentialDocs);
      }
    }

    const updatedEssentials = await Essential.find({ userId: req.user._id, isActive: true });

    res.json({
      message: 'Settings updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        allowanceAmount: user.allowanceAmount,
        allowanceFrequency: user.allowanceFrequency,
        setupCompleted: user.setupCompleted
      },
      essentials: updatedEssentials
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to add a single essential
router.post('/essentials', auth, async (req, res) => {
  try {
    const { name, amount, dueDate } = req.body;

    if (!name || !amount || !dueDate) {
      return res.status(400).json({ message: 'Name, amount, and due date are required' });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    if (parseInt(dueDate) < 1 || parseInt(dueDate) > 31) {
      return res.status(400).json({ message: 'Due date must be between 1 and 31' });
    }

    const essential = new Essential({
      name: name.trim(),
      amount: parseFloat(amount),
      dueDate: parseInt(dueDate),
      userId: req.user._id,
      isActive: true
    });

    await essential.save();

    const allEssentials = await Essential.find({ userId: req.user._id, isActive: true });

    res.json({
      message: 'Essential added successfully',
      essential,
      allEssentials
    });
  } catch (error) {
    console.error('Add essential error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Debug route to check all essentials for a user
router.get('/debug/essentials', auth, async (req, res) => {
  try {
    const allEssentials = await Essential.find({ userId: req.user._id });
    const activeEssentials = await Essential.find({ userId: req.user._id, isActive: true });

    res.json({
      user: req.user.name,
      totalEssentials: allEssentials.length,
      activeEssentials: activeEssentials.length,
      allEssentials: allEssentials.map(e => ({
        name: e.name,
        amount: e.amount,
        dueDate: e.dueDate,
        isActive: e.isActive,
        createdAt: e.createdAt
      })),
      activeOnly: activeEssentials.map(e => ({
        name: e.name,
        amount: e.amount,
        dueDate: e.dueDate,
        createdAt: e.createdAt
      }))
    });
  } catch (error) {
    console.error('Debug essentials error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to verify current email and change to new email
router.post('/change-email', auth, async (req, res) => {
  try {
    const { currentEmail, newEmail } = req.body;

    if (!currentEmail || !newEmail) {
      return res.status(400).json({ message: 'Current email and new email are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Debug - Email comparison:');
    console.log('Database email:', user.email);
    console.log('Provided email:', currentEmail);
    console.log('Match:', user.email === currentEmail);

    if (user.email !== currentEmail) {
      return res.status(400).json({
        message: 'Current email does not match',
        debug: {
          provided: currentEmail,
          actual: user.email
        }
      });
    }

    if (currentEmail === newEmail) {
      return res.status(400).json({ message: 'New email must be different from current email' });
    }

    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    user.email = newEmail;
    await user.save();

    res.json({ message: 'Email updated successfully' });
  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to verify current password and change to new password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;