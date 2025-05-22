const express = require('express');
require('dotenv').config();
const app = express()
const cors = require('cors');
const port = process.env.port || 5000;
const morgan = require('morgan');


app.use(express.json())
app.use(cors())
app.use(morgan('dev'));



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.pmlso.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const db = client.db("Edu-Manager")
    const classCollection = db.collection("class")
    const feedBackCollection = db.collection("feedback")

    
    // add class 
    app.post('/class',async(req,res)=>{
      const classData = req.body;
      const classDataWithStatus = {
        ...classData,status:"pending"
      }
      const result = await classCollection.insertOne(classDataWithStatus)
      res.send(result)

    })
    // Add FeedBack
    app.post('/feedback',async(req,res)=>{
      const feedBackData = req.body;
      const result = await feedBackCollection.insertOne(feedBackData)
      res.send(result)
    })


    // Get All Classes
    app.get('/class',async(req,res)=>{
      const result = await classCollection.find().toArray()
      res.send(result)
    })
    


    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/',(req,res)=>{
  res.send("Basic NextClass Server is Running")
})

app.listen(port, () =>{
  console.log("NextClass running on Port : ",port)
})
