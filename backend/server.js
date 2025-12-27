const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(cors());
// AUMENTAMOS O LIMITE PARA 50MB (Para caber as fotos)
app.use(bodyParser.json({ limit: '50mb' })); 

// Se der erro de EBUSY, mude o nome do arquivo aqui para 'database_v3.sqlite'
const db = new sqlite3.Database('./database_novo.sqlite', (err) => {
    if (err) console.error(err.message);
    else console.log('✅ Banco de Dados Conectado!');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, email TEXT UNIQUE, senha TEXT
    )`);

    // ADICIONAMOS A COLUNA 'fotos'
    db.run(`CREATE TABLE IF NOT EXISTS anuncios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        titulo TEXT,
        fotos TEXT, 
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

// ... (Rotas de Login/Cadastro iguais) ...

// ROTA ANUNCIAR (ATUALIZADA)
app.post('/api/anunciar', (req, res) => {
    const d = req.body;
    
    // Adicionamos 'fotos' na query SQL
    const sql = `INSERT INTO anuncios (
        usuario_id, titulo, fotos, categorias, tags, modo_atendimento, tipo_preco, valor, 
        descricao, experiencia, prazo, garantia, politica, emergencia, tipo_pessoa, 
        nome_documento, documento_numero, telefone, cep, pagamentos, agenda
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

    const params = [
        d.usuario_id, d.titulo, JSON.stringify(d.fotos), JSON.stringify(d.categorias), d.tags, 
        d.modo_atendimento, d.tipo_preco, d.valor, d.descricao, d.experiencia, d.prazo, 
        d.garantia, d.politica, d.emergencia ? 1 : 0, d.tipo_pessoa, d.nome_documento, 
        d.documento_numero, d.telefone, d.cep, JSON.stringify(d.pagamentos), JSON.stringify(d.agenda)
    ];

    db.run(sql, params, function(err) {
        if(err) return res.status(500).json({success:false, msg: err.message});
        res.json({success:true, msg:"Anúncio publicado!"});
    });
});

// ROTA LISTAR (PARA A HOME)
app.get('/api/anuncios', (req, res) => {
    db.all(`SELECT * FROM anuncios ORDER BY id DESC`, [], (err, rows) => {
        if(err) return res.json([]);
        res.json(rows);
    });
});

app.listen(PORT, () => console.log(`🔥 Servidor rodando na porta ${PORT}`));