const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET ?? "mvp-local-secret-change-me";

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body?.name ?? "").trim();

    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();

    const password = String(req.body?.password ?? "");

    const personalDataConsent =
      req.body?.personalDataConsent === true;

    const privacyConsent =
      req.body?.privacyConsent === true;

    const aiConsent =
      req.body?.aiConsent === true;

    if (!name) {
      return res.status(400).json({
        error: "Введите имя",
      });
    }

    if (!email) {
      return res.status(400).json({
        error: "Введите email",
      });
    }

    if (!password) {
      return res.status(400).json({
        error: "Введите пароль",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Пароль должен содержать минимум 8 символов",
      });
    }

    if (!personalDataConsent) {
      return res.status(400).json({
        error: "Подтвердите согласие на обработку персональных данных",
      });
    }

    if (!privacyConsent) {
      return res.status(400).json({
        error: "Подтвердите политику конфиденциальности",
      });
    }

    if (!aiConsent) {
      return res.status(400).json({
        error: "Подтвердите использование AI",
      });
    }

    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);

    if (existingUser) {
      return res.status(409).json({
        error: "Пользователь с таким email уже существует",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = db
      .prepare(`
        INSERT INTO users (
          name,
          email,
          password_hash,
          personal_data_consent,
          privacy_consent,
          ai_consent
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        name,
        email,
        passwordHash,
        1,
        1,
        1
      );

    const userId = Number(result.lastInsertRowid);

    db.prepare(`
      INSERT INTO user_data (user_id)
      VALUES (?)
    `).run(userId);

    const token = jwt.sign(
      {
        userId,
        email,
      },
      JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );

    return res.status(201).json({
      token,
      user: {
        id: userId,
        name,
        email,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      error: "Ошибка регистрации",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();

    const password = String(req.body?.password ?? "");

    const user = db
      .prepare(`
        SELECT id, name, email, password_hash
        FROM users
        WHERE email = ?
      `)
      .get(email);

    if (!user) {
      return res.status(401).json({
        error: "Неверный email или пароль",
      });
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      return res.status(401).json({
        error: "Неверный email или пароль",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      error: "Ошибка входа",
    });
  }
});

module.exports = router;