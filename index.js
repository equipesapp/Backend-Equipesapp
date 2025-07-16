require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb'); // <- import ObjectId

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

    // Rota POST para cadastro da equipe
    app.post('/equipes', async (req, res) => {
      try {
        const equipeData = req.body;
        equipeData.dataCadastro = new Date();

        if (!equipeData.nomeEquipe || !equipeData.categoria || !equipeData.tecnico) {
          return res.status(400).send({ message: "Dados incompletos para cadastro." });
        }

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
        const dadosAtualizados = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'ID inválido' });
        }

        if (!dadosAtualizados.nomeEquipe || !dadosAtualizados.categoria || !dadosAtualizados.tecnico) {
          return res.status(400).json({ message: 'Dados incompletos para atualização.' });
        }

        const result = await equipesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: dadosAtualizados }
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

    // Inicia o servidor
    app.listen(port, () => {
      console.log(`Servidor rodando na porta ${port}`);
    });

  } catch (err) {
    console.error("Erro ao conectar ao MongoDB:", err);
    await client.close();
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);

  // --- Auto-ping a cada 5 minutos ---
  const SELF_URL = `https://backend-equipesapp.onrender.com/ping`; // 🔁 Substitua pela sua URL pública
  setInterval(() => {
    axios.get(SELF_URL)
      .then(() => {
        console.log(`[AUTO-PING] Ping enviado para ${SELF_URL}`);
      })
      .catch((err) => {
        console.error(`[AUTO-PING] Erro: ${err.message}`);
      });
  }, 5 * 60 * 1000); // 5 minutos em milissegundos
});

run();
