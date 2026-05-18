import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
const corsOrigin = process.env.CORS_ORIGIN || '*';

app.use(helmet());
app.use(express.json());
app.use(cors({ origin: corsOrigin, credentials: true }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'hvacdirecto-backend' });
});

app.post('/auth/register', async (req, res) => {
  const { firstName, lastName, email, phone = '', password } = req.body ?? {};

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'Faltan campos obligatorios.' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase().trim()]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ message: 'Ese correo ya está registrado.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const inserted = await client.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, first_name, last_name, email, phone, created_at`,
      [firstName.trim(), lastName.trim(), email.toLowerCase().trim(), phone.trim(), passwordHash]
    );

    const user = inserted.rows[0];
    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: jwtExpiresIn });

    res.status(201).json({
      message: 'Usuario registrado correctamente.',
      token,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar el usuario.' });
  } finally {
    client.release();
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Faltan credenciales.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, first_name, last_name, email, phone, password_hash, is_active FROM users WHERE email = $1 LIMIT 1',
      [email.toLowerCase().trim()]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ message: 'La cuenta está desactivada.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    await pool.query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: jwtExpiresIn });

    res.json({
      message: 'Inicio de sesión correcto.',
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al iniciar sesión.' });
  }
});

app.use((_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada.' });
});

app.listen(port, () => {
  console.log(`Backend listo en puerto ${port}`);
});
