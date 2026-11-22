const express = require('express');
const cors = require('cors');
const { MongoClient } = require ( 'mongodb' )
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_DB_URI);

async function connectToMongoDB() {
  try {
    await client.connect();

    const database = client.db("assignment10_db");
    const recipeCollection = database.collection("recipes");

    console.log('You successfully connected to MongoDB!');

    // GET all recipes
    app.get('/recipes', async (req, res) => {
      try {
        const result = await recipeCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch recipes' });
      }
    });

    // POST a recipe
    app.post('/recipes', async (req, res) => {
      try {
        const recipe = req.body;
        const result = await recipeCollection.insertOne(recipe);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to add recipe' });
      }
    });

  } catch (err) {
    console.error('MongoDB connection failed:', err);
  }
}

app.get('/', (req, res) => {
  res.send('RecipeHub Server is Running!');
});

async function startServer() {
  await connectToMongoDB();

  app.listen(port, () => {
    console.log(`RecipeHub server listening on port ${port}`);
  });
}

startServer();