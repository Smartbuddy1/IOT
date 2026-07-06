import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'smartbuddy_super_secret_jwt_key_2026');
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: 'Invalid or Expired Token' });
  }
};

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = { id: 0, role: 'Guest', name: 'Field Tech (Direct Link)' };
    return next();
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'smartbuddy_super_secret_jwt_key_2026');
    req.user = verified;
    next();
  } catch (error) {
    req.user = { id: 0, role: 'Guest', name: 'Field Tech (Direct Link)' };
    next();
  }
};

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to roles: [${allowedRoles.join(', ')}]`
      });
    }
    next();
  };
};
