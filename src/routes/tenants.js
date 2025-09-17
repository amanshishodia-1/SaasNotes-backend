const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

// Upgrade tenant subscription (Admin only)
router.post('/:slug/upgrade', requireRole(['admin']), async (req, res) => {
  try {
    const { slug } = req.params;
    const { user } = req;

    // Verify the tenant slug matches the user's tenant
    if (user.tenant.slug !== slug) {
      return res.status(403).json({ error: 'Access denied to this tenant' });
    }

    // Check if already on pro plan
    if (user.tenant.plan === 'pro') {
      return res.status(400).json({ error: 'Tenant is already on Pro plan' });
    }

    // Upgrade tenant to pro plan
    const updatedTenant = await prisma.tenant.update({
      where: { slug },
      data: { plan: 'pro' }
    });

    res.json({
      message: 'Tenant successfully upgraded to Pro plan',
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        slug: updatedTenant.slug,
        plan: updatedTenant.plan
      }
    });
  } catch (error) {
    console.error('Upgrade tenant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
