const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error(err.message);
    else console.log('✅ Banco de Dados Conectado.');
});

db.serialize(() => {
    // Tabela Usuários
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        email TEXT UNIQUE,
        senha TEXT
    )`);

    // Tabela Anúncios (Estrutura do seu formulário original)
    db.run(`CREATE TABLE IF NOT EXISTS anuncios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        titulo TEXT,
        categorias TEXT,
        tags TEXT,
        modo_atendimento TEXT,
        tipo_preco TEXT,
        valor TEXT,
        descricao TEXT,
        experiencia TEXT,
        prazo TEXT,
        garantia TEXT,
        politica TEXT,
        emergencia INTEGER,
        tipo_pessoa TEXT,
        nome_documento TEXT,
        documento_numero TEXT,
        telefone TEXT,
        cep TEXT,
        pagamentos TEXT,
        agenda TEXT,
        status TEXT DEFAULT 'Em análise'
    )`);
});

// Rotas Básicas
app.post('/api/cadastro', (req, res) => {
    const { nome, email, senha } = req.body;
    db.run(`INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)`, [nome, email, senha], function(err) {
        if(err) return res.status(400).json({success:false, msg:"Erro/Email já existe"});
        res.json({success:true});
    });
});

app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    db.get(`SELECT * FROM usuarios WHERE email = ? AND senha = ?`, [email, senha], (err, row) => {
        if(row) res.json({success:true, user:row});
        else res.status(401).json({success:false});
    });
});

// Rota ANUNCIAR (Recebe tudo do seu form original)
app.post('/api/anunciar', (req, res) => {
    const d = req.body;
    const sql = `INSERT INTO anuncios (usuario_id, titulo, categorias, tags, modo_atendimento, tipo_preco, valor, descricao, experiencia, prazo, garantia, politica, emergencia, tipo_pessoa, nome_documento, documento_numero, telefone, cep, pagamentos, agenda) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    
    const params = [
        d.usuario_id, d.titulo, JSON.stringify(d.categorias), d.tags, d.modo_atendimento, 
        d.tipo_preco, d.valor, d.descricao, d.experiencia, d.prazo, d.garantia, d.politica, 
        d.emergencia ? 1 : 0, d.tipo_pessoa, d.nome_documento, d.documento_numero, 
        d.telefone, d.cep, JSON.stringify(d.pagamentos), JSON.stringify(d.agenda)
    ];

    db.run(sql, params, function(err) {
        if(err) {
            console.error(err);
            return res.status(500).json({success:false, msg:"Erro no banco"});
        }
        res.json({success:true, msg:"Anúncio enviado!"});
    });
});

app.listen(PORT, () => console.log(`🔥 Servidor rodando na porta ${PORT}`));