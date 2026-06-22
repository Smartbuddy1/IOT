/**
 * Global XSS Sanitization Middleware
 * Recursively strips dangerous HTML and script tags from incoming request payloads.
 */

// A simple but effective regex to strip dangerous tags. 
// For a production system, using a dedicated library like DOMPurify or xss is ideal,
// but this provides strong baseline protection against common injection vectors.
const stripDangerousTags = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '') // Strip inline event handlers like onload=""
    .replace(/on\w+='[^']*'/gi, ''); 
};

const sanitizeObject = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return stripDangerousTags(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitizedObj = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitizedObj[key] = sanitizeObject(value);
  }
  return sanitizedObj;
};

export const sanitizePayload = (req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};
