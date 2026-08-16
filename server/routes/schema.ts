import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

router.get('/api/admin/schema-sql', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'supabase', 'migrations', 'arc_portal_persistence_repair.sql');
    if (fs.existsSync(filePath)) {
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(sqlContent);
    }
    return res.status(404).send('-- Migration file not found');
  } catch (err) {
    return res.status(500).send('-- Error reading migration file: ' + String(err));
  }
});

export default router;
