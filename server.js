require('dotenv').config(); // Carrega as variáveis do .env
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// Garante que a pasta de uploads exista
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Servir frontend e imagens
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// --- Configuração do Pool (Usando as variáveis da sua imagem) ---
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

// Teste de conexão
pool.connect((err, client, release) => {
  if (err) {
    console.error('--------------------------------------------------');
    console.error('❌ ERRO DE CONEXÃO:');
    console.error('Mensagem:', err.message);
    console.log('\nDICA: O arquivo .env deve estar fora da pasta public!');
    console.error('--------------------------------------------------');
  } else {
    console.log('--------------------------------------------------');
    console.log('✅ CONECTADO AO SUPABASE COM SUCESSO!');
    console.log('--------------------------------------------------');
    release();
  }
});

// --- Multer para Imagens ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- Rotas ---

// Cadastrar
app.post('/cadastrar', upload.single('imagem'), async (req, res) => {
  const { titulo, descricao, solucao, categoria } = req.body;
  const imagem = req.file ? '/uploads/' + req.file.filename : null;

  try {
    await pool.query(
      `INSERT INTO base_conhecimento (titulo, descricao, solucao, categoria, imagem) 
       VALUES ($1, $2, $3, $4, $5)`,
      [titulo, descricao, solucao, categoria, imagem]
    );
    res.send('✅ Registro salvo com sucesso!');
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Erro ao salvar dados.');
  }
});

// Buscar
app.get('/base', async (req, res) => {
  const busca = req.query.busca || '';
  try {
    const result = await pool.query(
      `SELECT * FROM base_conhecimento 
       WHERE titulo ILIKE $1 OR descricao ILIKE $1 OR categoria ILIKE $1 
       ORDER BY id DESC`,
      [`%${busca}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Erro ao buscar dados.');
  }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});