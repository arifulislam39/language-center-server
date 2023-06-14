const express = require("express");
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const app = express();

const port = process.env.PORT || 5000;

//middle ware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
//const { default: Stripe } = require("stripe");
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
    const paymentCollection = client.db("languageDB").collection("payments");
    const blogCollection = client.db("languageDB").collection("blogs");

    //class related api........
    //add class
    app.post("/classes", async (req, res) => {
      const item = req.body;
      const result = await classCollection.insertOne(item);
      res.send(result);
    });
    //get all class
    app.get("/classes", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    //get popular classes
    app.get("/popularClass", async (req, res) => {
      const result = await classCollection
        .find()
        .sort({ enrolled_student: -1 })
        .limit(6)
        .toArray();
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

    //update class api added
    app.put("/updateClass/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const body = req.body;
      console.log(body);
      const updateDoc = {
        $set: {
          class_name: body.class_name,
          class_image: body.class_image,
          available_seats: body.available_seats,
          price: body.price,
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
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

    //delete class from selected page
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


    //get enrolled classes
    app.get("/payments", async (req, res) => {
      const result = await  paymentCollection.find().toArray();
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
//get all admin

app.get('/users/admin/:email', async (req, res) => {
  const email = req.params.email;
  const query = { email: email }
  const user = await usersCollection.findOne(query);
  const result = { admin: user?.role === 'admin' }
  res.send(result);
})

    

// all instructor
app.get('/users/instructor/:email', async (req, res) => {
  const email = req.params.email;
  const query = { email: email }
  const user = await usersCollection.findOne(query);
  const result = {instructor: user?.role === 'instructor' }
  res.send(result);
})


    
//student
    app.get("/student", async (req, res) => {
      const query = { role: 'student' };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    

    //6 instructor
    app.get("/instructor", async (req, res) => {
      const query = { role: 'instructor' };
      const result = await usersCollection.find(query).limit(6).toArray();
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

    //payment
    //get single card data for payment
    app.get("/cart/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };

      const options = {
        projection: {
          price: 1,
          enrolled_student: 1,
          class_image: 1,
          class_name: 1,
          instructor_name: 1,
          available_seats: 1,
          _id: 1,
          email: 1,
          classId: 1,
        },
      };

      const result = await cartCollection.findOne(query, options);
      console.log(result);
      res.send(result);
    });

    //create-payment-intent

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      console.log(req.body);
      const amount = parseInt(price * 100);

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        res.status(500).send({
          error: error.message,
        });
      }
    });

    //save payment history
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

      const id = payment._id; 
      const query = { _id: new ObjectId(id) };
      const deleteResult = await cartCollection.deleteOne(query);

      const classIds = payment.classId;
      
      const filter = { _id: new ObjectId(classIds) };
      const updateDoc = {
        $inc: {
          enrolled_student: 1,
          available_seats: -1,
        },
      };
      const updateResult = await classCollection.updateOne(filter, updateDoc);

      res.send({ insertResult, deleteResult, updateResult });
    });


    app.get("/paymentHistory", async (req, res) => {
      const result = await paymentCollection
        .find()
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });




    //blog api
    app.get("/blogs", async (req, res) => {
      const result = await  blogCollection.find().toArray();
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
