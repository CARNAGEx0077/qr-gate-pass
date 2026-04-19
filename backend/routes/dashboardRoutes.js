const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

/* ─────────────────────────────────────────
   GET /api/dashboard
   Protected: any authenticated user
   ───────────────────────────────────────── */
router.get('/', protect, (req, res) => {
  return res.status(200).json({
    success: true,
    message: `Welcome, ${req.user.email}! You have access to the TKSCT Gate Pass dashboard.`,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
    data: {
      // Dummy gate pass data for demonstration
      totalPasses: 12,
      approved: 9,
      pending: 2,
      rejected: 1,
      recentActivity: [
        { passId: 'GP-0412', status: 'approved', timestamp: new Date().toISOString() },
        { passId: 'GP-0411', status: 'pending', timestamp: new Date(Date.now() - 18000000).toISOString() },
        { passId: 'GP-0410', status: 'approved', timestamp: new Date(Date.now() - 86400000).toISOString() },
      ],
    },
  });
});

/* ─────────────────────────────────────────
   GET /api/dashboard/admin
   Protected: admin and staff only
   ───────────────────────────────────────── */
router.get('/admin', protect, authorize('admin', 'staff'), (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Admin panel — full gate pass management.',
    data: {
      totalStudents: 850,
      totalStaff: 62,
      todayExits: 34,
      todayEntries: 31,
      pendingApprovals: 7,
    },
  });
});

module.exports = router;
