const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');

/**
 * MemorIA Donation Backend - Node.js Stable Edition
 * Using SQLite as a reliable, zero-config replacement for H2.
 */

const app = express();
const PORT = 8085;

// Middleware
app.use(cors({ origin: 'http://localhost:4200' }));
app.use(bodyParser.json());

// Database Setup
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './h2_donation_emulation.db', // Named for project consistency
  logging: false
});

// Donation Model
const Donation = sequelize.define('Donation', {
  amount: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'USD'
  },
  dedicated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  honoreeName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isEmail: true }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  receiveEmail: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Sync Database
sequelize.sync()
  .then(() => console.log('✅ Donation database synced successfully (SQLite H2-Emulation).'))
  .catch(err => console.error('❌ Sync error:', err));

// Routes
app.post('/api/donations', async (req, res) => {
  try {
    const donation = await Donation.create(req.body);
    res.status(201).json(donation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/donations', async (req, res) => {
  try {
    const donations = await Donation.findAll({ order: [['createdAt', 'DESC']] });
    res.json(donations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Donation Backend running on http://localhost:${PORT}`);
});
