const path = require('node:path');
const express = require('express');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT || 3000);
const mongoUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB || 'lead_ledger';
const appUsername = process.env.APP_USERNAME || 'itsruth4';
const appPassword = process.env.APP_PASSWORD || '1234';
const sessionSecret = process.env.SESSION_SECRET || 'change-this-session-secret';

if (!mongoUri) {
  console.error('Missing MONGODB_URI. Copy .env.example to .env and add your MongoDB connection string.');
  process.exit(1);
}

const client = new MongoClient(mongoUri);
let database;

app.use(express.json({ limit: '2mb' }));
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 }
}));

function requireLogin(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ error: 'Login required' });
}

function collectionFor(name) {
  return database.collection(name);
}

function serialize(document) {
  return { id: document._id.toString(), ...document, _id: undefined };
}

function objectId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/session', (req, res) => res.json({ authenticated: Boolean(req.session.user) }));

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username !== appUsername || password !== appPassword) {
    return res.status(401).json({ error: 'Incorrect username or password' });
  }
  req.session.user = username;
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.use('/api/leads', requireLogin);
app.use('/api/team', requireLogin);

app.get('/api/:collection', async (req, res, next) => {
  try {
    const collection = req.params.collection;
    if (!['leads', 'team'].includes(collection)) return res.status(404).json({ error: 'Unknown collection' });
    const sortField = collection === 'team' ? 'name' : 'createdAt';
    const documents = await collectionFor(collection).find().sort({ [sortField]: 1 }).toArray();
    res.json(documents.map(serialize));
  } catch (error) { next(error); }
});

app.post('/api/:collection', async (req, res, next) => {
  try {
    const collection = req.params.collection;
    if (!['leads', 'team'].includes(collection)) return res.status(404).json({ error: 'Unknown collection' });
    const document = { ...req.body, createdAt: req.body.createdAt || new Date().toISOString() };
    delete document.id;
    const result = await collectionFor(collection).insertOne(document);
    res.status(201).json({ id: result.insertedId.toString(), ...document });
  } catch (error) { next(error); }
});

app.patch('/api/:collection/:id', async (req, res, next) => {
  try {
    const collection = req.params.collection;
    const id = objectId(req.params.id);
    if (!id || !['leads', 'team'].includes(collection)) return res.status(404).json({ error: 'Record not found' });
    const update = { ...req.body };
    delete update.id;
    const result = await collectionFor(collection).updateOne({ _id: id }, { $set: update });
    if (!result.matchedCount) return res.status(404).json({ error: 'Record not found' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.delete('/api/:collection/:id', async (req, res, next) => {
  try {
    const collection = req.params.collection;
    const id = objectId(req.params.id);
    if (!id || !['leads', 'team'].includes(collection)) return res.status(404).json({ error: 'Record not found' });
    const result = await collectionFor(collection).deleteOne({ _id: id });
    if (!result.deletedCount) return res.status(404).json({ error: 'Record not found' });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.use(express.static(__dirname));
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Database request failed' });
});

async function start() {
  await client.connect();
  database = client.db(databaseName);
  app.listen(port, '0.0.0.0', () => console.log(`Lead Ledger running on port ${port}`));
}

start().catch((error) => {
  console.error('Could not connect to MongoDB:', error.message);
  process.exit(1);
});

process.on('SIGINT', async () => { await client.close(); process.exit(0); });
process.on('SIGTERM', async () => { await client.close(); process.exit(0); });