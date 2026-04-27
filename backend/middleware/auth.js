const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { normalizeDepartment } = require('../utils/department');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user.department = normalizeDepartment(req.user.department);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

const crOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'cr' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'CR access required' });
  }
};

const teacherOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Teacher access required' });
  }
};

const teacherOrCR = (req, res, next) => {
  if (req.user && ['teacher', 'cr', 'admin'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Teacher or CR access required' });
  }
};

module.exports = { protect, adminOnly, crOnly, teacherOnly, teacherOrCR };
