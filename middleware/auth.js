// Shared authentication middleware for all routes

/**
 * For API routes — returns JSON 401 if not logged in.
 */
function requireApiAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Not logged in.' });
  }
  next();
}

/**
 * For EJS routes — redirects to /login if not logged in.
 */
function requireEjsAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

module.exports = { requireApiAuth, requireEjsAuth };
