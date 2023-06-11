const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

//middle ware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4bttisu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const classCollection = client.db("languageDB").collection("classes");
    const usersCollection = client.db("languageDB").collection("users");
    const cartCollection = client.db("languageDB").collection("carts");



    //class related api........
    //get all class
    app.get("/classes", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });
    //add class
    app.post("/classes", async (req, res) => {
      const item = req.body;
      const result = await classCollection.insertOne(item);
      res.send(result);
    });
    //get my classes by email
    app.get("/classes/:email", async (req, res) => {
      const result = await classCollection
        .find({ email: req.params.instructor_email })
        .toArray();
      res.send(result);
      console.log(result);
    });

    //selected class added
    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    //get selected classes by email
    app.get("/carts/:email", async (req, res) => {
      const query = { email: req.params.email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
      console.log(result);
    });
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });


    
    // class approve , deny  feedback api

    app.patch("/classes/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {},
      };

      if (req.body.feedback) {
        updateDoc.$set.feedback = req.body.feedback;
      }

      if (req.body.status) {
        updateDoc.$set.status = req.body.status;
      }

      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });


    //users related api's...........
   // .............
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //get all users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    //user make admin or instructor api
    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: req.body.role,
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Language server is running");
});

app.listen(port, () => {
  console.log(`language server running on port ${port}`);
});
