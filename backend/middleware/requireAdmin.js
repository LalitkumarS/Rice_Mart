// backend/middleware/requireAdmin.js
//
// Must run AFTER authMiddleware (needs req.user already set from a verified
// Firebase ID token). Checks that the authenticated user's email is on the
// admin allow-list.
//
// This is a pragmatic approach for a small project: list admin emails in
// backend/.env as ADMIN_EMAILS="you@example.com,other-admin@example.com".
//
// For a production app, prefer Firebase custom claims instead of an email
// list, e.g.:
//   admin.auth().setCustomUserClaims(uid, { admin: true });
// and then check `req.user.admin === true` here — custom claims live on the
// token itself and can't be spoofed by knowing someone's email address.

const requireAdmin = (req, res, next) => {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const userEmail = req.user?.email?.toLowerCase();

  if (!userEmail || !adminEmails.includes(userEmail)) {
    console.warn(`requireAdmin: blocked non-admin user "${userEmail}" from an admin route.`);
    return res.status(403).json({ message: "Forbidden: admin access required." });
  }

  next();
};

module.exports = requireAdmin;
