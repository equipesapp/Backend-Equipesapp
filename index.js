require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // Necessário para o auto-ping
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
if (!uri) throw new Error('A variável MONGO_URI não foi definida no .env');

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("Conectado ao MongoDB com sucesso!");

    const database = client.db("volei-app");
    const equipesCollection = database.collection("equipes");

    // Rota de ping para manter o servidor acordado
    app.get('/ping', (req, res) => {
      res.status(200).send('pong');
    });

    // Rota POST para cadastro (agora recebe e salva o userId)
    app.post('/equipes', async (req, res) => {
      try {
        const { nomeEquipe, categoria, tecnico, atletas, liberos, userId } = req.body;

        if (!nomeEquipe || !categoria || !userId) {
          return res.status(400).send({ message: "Dados incompletos. userId é obrigatório." });
        }

        const equipeData = {
          userId, // Salva o ID do usuário
          nomeEquipe,
          categoria,
          tecnico,
          atletas,
          liberos,
          dataCadastro: new Date()
        };

        const result = await equipesCollection.insertOne(equipeData);
        res.status(201).send({ message: "Equipe cadastrada com sucesso!", insertedId: result.insertedId });
      } catch (error) {
        console.error("Erro ao cadastrar equipe:", error);
        res.status(500).send({ message: "Erro ao cadastrar", error: error.message });
      }
    });

    // Rota GET para listar equipes (agora filtra por userId)
    app.get('/equipes/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        if (!userId) {
          return res.status(400).json({ message: 'userId é obrigatório' });
        }
        // Busca no banco apenas as equipes com o userId correspondente
        const equipes = await equipesCollection.find({ userId: userId }).toArray();
        res.status(200).json(equipes);
      } catch (error) {
        console.error("Erro ao buscar equipes:", error);
        res.status(500).send({ message: "Erro ao buscar equipes", error: error.message });
      }
    });

    // Rota GET para buscar uma equipe específica por ID (mantida como estava)
    app.get('/equipes/details/:id', async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'ID inválido' });
        }
        const equipe = await equipesCollection.findOne({ _id: new ObjectId(id) });
        if (!equipe) {
          return res.status(404).json({ message: 'Equipe não encontrada' });
        }
        res.json(equipe);
      } catch (error) {
        console.error('Erro ao buscar equipe:', error);
        res.status(500).json({ message: 'Erro ao buscar equipe', error: error.message });
      }
    });

    // Rota PUT para atualizar equipe
    app.put('/equipes/:id', async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'ID inválido' });
        
        const { nomeEquipe, categoria, tecnico, atletas, liberos } = req.body;
        
        const result = await equipesCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { nomeEquipe, categoria, tecnico, atletas, liberos } }
        );

        if (result.matchedCount === 0) return res.status(404).json({ message: 'Equipe não encontrada.' });
        res.status(200).json({ message: 'Equipe atualizada com sucesso!' });
      } catch (error) {
        console.error('Erro ao atualizar equipe:', error);
        res.status(500).json({ message: 'Erro ao atualizar equipe' });
      }
    });

    // Rota DELETE para excluir equipe
    app.delete('/equipes/:id', async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'ID inválido' });

        const result = await equipesCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ message: 'Equipe não encontrada.' });
        
        res.status(200).json({ message: 'Equipe excluída com sucesso!' });
      } catch (error) {
        console.error('Erro ao excluir equipe:', error);
        res.status(500).json({ message: 'Erro ao excluir equipe' });
      }
    });

  } catch (err) {
    console.error("Erro ao conectar ao MongoDB:", err);
    await client.close();
  }
}

run().then(() => {
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
    
    // --- Auto-ping a cada 5 minutos ---
    // ATENÇÃO: Substitua a URL abaixo pela URL pública do seu backend no Render.
    const SELF_URL = `https://backend-equipesapp.onrender.com/ping`; 
    setInterval(() => {
      axios.get(SELF_URL)
        .then(() => {
          console.log(`[AUTO-PING] Ping enviado para ${SELF_URL}`);
        })
        .catch((err) => {
          console.error(`[AUTO-PING] Erro: ${err.message}`);
        });
    }, 3 * 60 * 1000); // 5 minutos
  });
});
