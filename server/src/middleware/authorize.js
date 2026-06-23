const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Flatten roles in case an array is passed
    const allowedRoles = roles.flat();

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
};

module.exports = authorize;