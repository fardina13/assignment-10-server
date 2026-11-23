const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
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


    // GET all recipes with Category Filter & Pagination
    app.get('/recipes', async (req, res) => {
      try {
        const {
          category,
          page = 1,
          limit = 9
        } = req.query;

        const currentPage = Math.max(1, Number(page) || 1);
        const itemsPerPage = [9, 12].includes(Number(limit))
          ? Number(limit)
          : 9;

        const filter = {};

        // Category Filter
        if (category && category !== 'All') {
          filter.category = { $in: [category] };
        }

        // Pagination
        const skip = (currentPage - 1) * itemsPerPage;

        const recipes = await recipeCollection
          .find(filter)
          .sort({ _id: -1 })
          .skip(skip)
          .limit(itemsPerPage)
          .toArray();

        const totalRecipes = await recipeCollection.countDocuments(filter);

        res.send({
          recipes,
          totalRecipes,
          totalPages: Math.ceil(totalRecipes / itemsPerPage),
          currentPage,
          limit: itemsPerPage
        });

      } catch (error) {
        console.error(error);
        res.status(500).send({
          message: 'Failed to fetch recipes'
        });
      }
    });


    // GET single recipe by ID
    app.get('/recipes/:id', async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            message: 'Invalid recipe ID'
          });
        }

        const recipe = await recipeCollection.findOne({
          _id: new ObjectId(id)
        });

        if (!recipe) {
          return res.status(404).send({
            message: 'Recipe not found'
          });
        }

        res.send(recipe);

      } catch (error) {
        console.error(error);
        res.status(500).send({
          message: 'Failed to fetch recipe details'
        });
      }
    });


    // POST a recipe
    app.post('/recipes', async (req, res) => {
      try {
        const recipe = {
          ...req.body,
          likesCount: 0,
          likedBy: []
        };

        const result = await recipeCollection.insertOne(recipe);

        res.send({
          success: true,
          insertedId: result.insertedId
        });

      } catch (error) {
        console.error(error);
        res.status(500).send({
          message: 'Failed to add recipe'
        });
      }
    });


    // LIKE a recipe
    app.patch('/recipes/:id/like', async (req, res) => {
      try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            message: 'Invalid recipe ID'
          });
        }

        if (!userId) {
          return res.status(400).send({
            message: 'User ID is required'
          });
        }

        const recipeId = new ObjectId(id);

        const result = await recipeCollection.updateOne(
          {
            _id: recipeId,
            likedBy: { $ne: userId }
          },
          {
            $inc: { likesCount: 1 },
            $addToSet: { likedBy: userId }
          }
        );

        const recipe = await recipeCollection.findOne({
          _id: recipeId
        });

        if (!recipe) {
          return res.status(404).send({
            message: 'Recipe not found'
          });
        }

        res.send({
          success: true,
          alreadyLiked: result.modifiedCount === 0,
          likesCount: recipe.likesCount || 0
        });

      } catch (error) {
        console.error(error);
        res.status(500).send({
          message: 'Failed to like recipe'
        });
      }
    });


    // DELETE a recipe
    app.delete('/recipes/:id', async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            message: 'Invalid recipe ID'
          });
        }

        const result = await recipeCollection.deleteOne({
          _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({
            message: 'Recipe not found'
          });
        }

        res.send({
          success: true,
          message: 'Recipe deleted successfully'
        });

      } catch (error) {
        console.error(error);
        res.status(500).send({
          message: 'Failed to delete recipe'
        });
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
