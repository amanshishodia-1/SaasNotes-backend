const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

// Helper function to check note limits for free plan
const checkNoteLimit = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { _count: { select: { notes: true } } }
  });
  
  if (tenant.plan === 'free' && tenant._count.notes >= 3) {
    return false;
  }
  return true;
};

// Create a note
router.post('/', [
  body('title').isLength({ min: 1, max: 200 }).trim(),
  body('content').isLength({ min: 1, max: 10000 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content } = req.body;
    const { user } = req;

    // Check note limit for free plan
    const canCreateNote = await checkNoteLimit(user.tenantId);
    if (!canCreateNote) {
      return res.status(403).json({ 
        error: 'Note limit reached. Upgrade to Pro plan for unlimited notes.',
        code: 'NOTE_LIMIT_REACHED'
      });
    }

    const note = await prisma.note.create({
      data: {
        title,
        content,
        userId: user.id,
        tenantId: user.tenantId
      }
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all notes for current tenant
router.get('/', async (req, res) => {
  try {
    const { user } = req;

    const notes = await prisma.note.findMany({
      where: { tenantId: user.tenantId },
      include: {
        user: {
          select: { id: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(notes);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific note
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const note = await prisma.note.findFirst({
      where: { 
        id,
        tenantId: user.tenantId // Ensure tenant isolation
      },
      include: {
        user: {
          select: { id: true, email: true }
        }
      }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(note);
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update note
router.put('/:id', [
  body('title').isLength({ min: 1, max: 200 }).trim(),
  body('content').isLength({ min: 1, max: 10000 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, content } = req.body;
    const { user } = req;

    // Check if note exists and belongs to current tenant
    const existingNote = await prisma.note.findFirst({
      where: { 
        id,
        tenantId: user.tenantId
      }
    });

    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = await prisma.note.update({
      where: { id },
      data: { title, content }
    });

    res.json(note);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete note
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Check if note exists and belongs to current tenant
    const existingNote = await prisma.note.findFirst({
      where: { 
        id,
        tenantId: user.tenantId
      }
    });

    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await prisma.note.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
