const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors({
  origin: ['http://localhost:5173','cars-doctor-cc5d1.web.app','cars-doctor-cc5d1.firebaseapp.com'],
  credentials:true
}))
app.use(express.json());
require('dotenv').config();
app.use(cookieParser());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w6mhf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
// middlewares
const logger = (req,res,next)=>{
  console.log(req.url);
  next()
}
const verifyToken = (req,res,next)=>{
  const token = req?.cookies?.token
  if(!token){
   return res.status(401).send({status:'UnAuthorized Access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN ,(err,decoded)=>{
    if(err){
      return res.status(401).send({status:"UnAuthorized Access"})
    }
    req.user = decoded;
    next()
  })
}
const cookieOption = {
  httpOnly:true,
  secure: process.env.NODE_ENV === "production"? "true": false,
  sameSite: process.env.NODE_ENV === "production"? "none" : "strict"
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const serviceCollection = client.db('carDoctor') .collection('services');
    const bookingCollection = client.db('carDoctor') .collection("bookings")
  

    // jwt
    app.post('/jwt',async(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN ,{expiresIn:'1h'})
      res
      .cookie('token',token ,cookieOption)
      .send({status:'success'})
    })

    app.post('/logout',async(req,res)=>{
      
      res.clearCookie('token',{...cookieOption, maxAge: 0}).send({status:'cookie removed'})
    })


    // services
    app.get("/services", async(req,res)=>{
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result)
    })

    app.get("/services/:id",async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const options ={
            projection: {title:1,price:1, service_id:1, img:1}
        }
        const result = await serviceCollection.findOne(query,options)
        res.send(result);
    })
// bookings

app.get("/bookings",logger, verifyToken, async(req,res)=>{
  if(req.query.email !== req.user.email){
    return res.status(403).send({status:'forbidden access'})
  }
    let query ={};
    if(req.query?.email){
        query={email: req.query.email}
    }
    const result = await bookingCollection.find(query).toArray()
    res.send(result)
})


app.post("/bookings", async(req,res)=>{
    const booking = req.body;
    const result = await bookingCollection.insertOne(booking);
    res.send(result)

})

app.patch("/bookings/:id", async(req,res)=>{
  const updatedBooking = req.body;
  const id = req.params.id;
  const filter = {_id: new ObjectId(id)}
  const updateDoc ={
    $set:{
      status: updatedBooking.status
    }
  }
  const result = await bookingCollection.updateOne(filter,updateDoc)
  res.send(result)

})

app.delete("/bookings/:id",async(req,res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)};
  const result = await bookingCollection.deleteOne(query)
  res.send(result); 
})
 


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get("/",(req,res)=>{
    res.send("doctor is running")
})

app.listen(port,()=>{
    console.log(`car doctor is running in port: ${port}`)
})