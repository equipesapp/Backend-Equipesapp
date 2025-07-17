require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // IMPORTAÇÃO ADICIONADA
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

    // Rota de ping para manter o servidor acordado (Render)
    app.get('/ping', (req, res) => {
      res.status(200).send('pong');
    });

    // Rota POST para cadastro da equipe
    app.post('/equipes', async (req, res) => {
      try {
        const { nomeEquipe, categoria, tecnico = null } = req.body;

        if (!nomeEquipe || !categoria) {
          return res.status(400).send({ message: "Nome da equipe e categoria são obrigatórios." });
        }

        const equipeData = {
          nomeEquipe,
          categoria,
          tecnico,
          dataCadastro: new Date()
        };

        const result = await equipesCollection.insertOne(equipeData);
        res.status(201).send({
          message: "Equipe cadastrada com sucesso!",
          insertedId: result.insertedId
        });
      } catch (error) {
        console.error("Erro ao cadastrar equipe:", error);
        res.status(500).send({ message: "Erro ao cadastrar", error: error.message });
      }
    });

    // Rota GET para listar equipes
    app.get('/equipes', async (req, res) => {
      try {
        const equipes = await equipesCollection.find().toArray();
        res.status(200).json(equipes);
      } catch (error) {
        console.error("Erro ao buscar equipes:", error);
        res.status(500).send({ message: "Erro ao buscar equipes", error: error.message });
      }
    });

    // Rota GET para buscar equipe por id
    app.get('/equipes/:id', async (req, res) => {
      try {
        const id = req.params.id;
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

    // Rota PUT para atualizar equipe pelo id
    app.put('/equipes/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'ID inválido' });
        }

        const { nomeEquipe, categoria, tecnico = null } = req.body;
        if (!nomeEquipe || !categoria) {
          return res.status(400).json({ message: 'Nome da equipe e categoria são obrigatórios.' });
        }

        const result = await equipesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              nomeEquipe,
              categoria,
              tecnico
            }
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Equipe não encontrada.' });
        }

        res.status(200).json({ message: 'Equipe atualizada com sucesso!' });

      } catch (error) {
        console.error('Erro ao atualizar equipe:', error);
        res.status(500).json({ message: 'Erro ao atualizar equipe', error: error.message });
      }
    });

    // Rota DELETE para excluir equipe por id
    app.delete('/equipes/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'ID inválido' });
        }

        const result = await equipesCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 1) {
          res.status(200).json({ message: 'Equipe excluída com sucesso!' });
        } else {
          res.status(404).json({ message: 'Equipe não encontrada.' });
        }
      } catch (error) {
        console.error('Erro ao excluir equipe:', error);
        res.status(500).json({ message: 'Erro ao excluir equipe', error: error.message });
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
  });
});

// --- Auto-ping a cada 2 minutos ---
const SELF_URL = `https://salas-app-back-end.onrender.com/ping`; // Substitua pela sua URL pública
setInterval(() => {
  axios.get(SELF_URL)
    .then(() => {
      console.log(`[AUTO-PING] Ping enviado para ${SELF_URL}`);
    })
    .catch((err) => {
      console.error(`[AUTO-PING] Erro: ${err.message}`);
    });
}, 2 * 60 * 1000); // 2 minutos
