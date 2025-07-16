// routes/tasks.js
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');

// Input validation rules
const taskValidationRules = [
  check('title', 'Title is required').trim().notEmpty(),
  check('priority', 'Valid priority is required').isIn(['low', 'medium', 'high']),
  check('status', 'Valid status is required').optional().isIn(['pending', 'in-progress', 'completed']),
  check('dueDate', 'Invalid due date').optional().isISO8601().toDate(),
  check('dueTime', 'Invalid time format (HH:MM)').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
];

const taskUpdateValidationRules = [
  check('title').optional().trim().notEmpty(),
  check('priority').optional().isIn(['low', 'medium', 'high']),
  check('status').optional().isIn(['pending', 'in-progress', 'completed']),
  check('dueDate').optional().isISO8601().toDate(),
  check('dueTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
];


// @route   GET /api/tasks
// @desc    Get all tasks for authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Add pagination (page, limit) and sorting options
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || '-createdAt';

    const tasks = await Task.find({ user: req.user.id })
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(limit);

    const totalTasks = await Task.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      count: tasks.length,
      total: totalTasks,
      pages: Math.ceil(totalTasks / limit),
      data: tasks
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @route   POST /api/tasks
// @desc    Create new task
// @access  Private
router.post('/', [auth, ...taskValidationRules], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
     console.log('Task data:', req.body);
    console.log('Authenticated user:', req.user);
    const task = new Task({
      ...req.body,
      user: req.user.id
    });

    await task.save();
    
    // Update user's last active timestamp
    await User.findByIdAndUpdate(req.user.id, { lastActive: new Date() });

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private
router.put('/:id', [auth, ...taskUpdateValidationRules], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    let task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Verify ownership
    if (task.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Prevent changing certain fields
    const { user, createdAt, _id, ...updateData } = req.body;
    
    task = await Task.findByIdAndUpdate(
      req.params.id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: task });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }


    // Verify ownership
    if (task.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await Task.findByIdAndDelete(task._id);
    res.json({ success: true, data: {} });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;