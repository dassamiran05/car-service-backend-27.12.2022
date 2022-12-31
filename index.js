const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { application } = require('express');
const port = process.env.PORT || 5000;
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const stripe = require("stripe")('sk_test_51H4St6KHspfP33ih3tLIioEMYiS4pbvuUdPhho9INjNzvCnYfL0bPDJpnT0oy8tbgA3bSudWx7yjlK3dIkD5jY4Q00GLkC0DiR');




//middle wares
//Carserviceuser
//Whfpo7Ldh1CzadJv
// app.use(bodyParser.uriencoded({extended : true}))
// app.use(bodyParser.json())
app.use(express.urlencoded({extended : true}));


app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8isb1v4.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyjwt(req, res, next){
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send('Unauthorise access');
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
    if(err){
      return res.status(403).send('Forbidden access');
    }
    req.decoded = decoded;

    next();
  })
}



async function run() {
  try {
    const serviceCollection = client.db("carService").collection("services");
    const ordersCollection = client.db("carService").collection("orders");
    const productsCollection = client.db("carService").collection("products");
    const usersCollection = client.db("carService").collection("users");
    const paymentsCollection = client.db("carService").collection("payments");

    const  verifyAdmin = async(req, res, next) =>{
      const decodedEmail = req.decoded.email;
      const query = {email:decodedEmail};
      const user = await usersCollection.findOne(query);

      if(user.role !== 'admin'){
        return res.status(403).send({message: 'Forbidden access'});
      }
      next();
    }

    app.get('/services', async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });


    // All services for admin
    app.get('/admin/services', verifyjwt, verifyAdmin, async(req, res) =>{
      const query2 = {};
      const cursor = serviceCollection.find(query2);
      const services = await cursor.toArray();
      res.send(services);
    })


    //Delete a service admin
    app.delete('/admin/service/:id', verifyjwt, verifyAdmin, async(req, res) =>{
      // const email = req.decoded.email;
      // const query = {email:email};
      // const user = await usersCollection.findOne(query);

      // if(user.role !== 'admin'){
      //   return res.status(403).send({message: 'Forbidden access'});
      // }

      const id= req.params.id;
      const query2 = {_id:ObjectId(id)};
      const delItem = await serviceCollection.deleteOne(query2);
      res.send(delItem);
    })

    app.get('/service/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await serviceCollection.findOne(query);
      res.send(service);
    });

    app.post('/services', verifyjwt, verifyAdmin, async(req, res) =>{

      // const email = req.decoded.email;
      // const query = {email:email};
      // const user = await usersCollection.findOne(query);

      // if(user.role !== 'admin'){
      //   return res.status(403).send({message: 'Forbidden access'});
      // }

      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    })

    //Orders api
    app.post('/orders', async (req, res) => {
      const orders = req.body;
      const result = await ordersCollection.insertOne(orders);
      res.send(result);
    })


    

    //Post users data to database
    app.post('/users', async(req, res) => {
      const user= req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    //Get all users api
    app.get('/users', verifyjwt, verifyAdmin, async(req, res)=> {

      // const decodedEmail = req.decoded.email;
      // const user = await usersCollection.findOne({email : decodedEmail});
      // if(user.role !== 'admin'){
      //   return res.status(403).send({message: 'Forbiddeb access'});
      // }
      const query = {};
      const cursor = usersCollection.find(query);
      const users = await cursor.toArray();
      res.send(users);

      
    })

    app.delete('/users/admin/:id', verifyjwt, verifyAdmin, async(req, res) => {
      // const decodedEmail = req.decoded.email;
      // const que = {email: decodedEmail};
      // const user = await usersCollection.findOne(que);

      // if(user.role !== 'admin'){
      //   return res.status(403).send({message: 'forbidden access'});
      // }

      const id = req.params.id;
      const query = {_id:ObjectId(id)};
      const deletedItem = await usersCollection.deleteOne(query);
      res.send(deletedItem);
    })


    //To check a user is admin or not
    app.get('/users/admin/:email', async(req, res) =>{
      const email = req.params.email;
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      res.send({isAdmin : user?.role === 'admin'}); 
    })

    app.get('/jwt', async(req, res) => {
      const email = req.query.email;
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      if(!user){
        res.status(403).send({accessToken: ''}); 
      }
      const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn:'1h'});
      return res.send({accessToken: token});
      
    })


    //Get all orders by specific mail
    app.get('/orders', verifyjwt,  async(req, res) =>{
      const email = req.query.email;
      const decodedEmail = req.decoded.email;

      if(email !== decodedEmail){
        return res.status(403).send({message: 'forbidden access'});
      }
      const query1 = { email: email };
      const orders = await ordersCollection.find(query1).toArray();
      res.send(orders);
    })

    //delete order api
    app.delete('/orders/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id:ObjectId(id)};
      const deleteItem = await ordersCollection.deleteOne(query);
      res.send(deleteItem);
    })


    //Get all orders for admin 
    app.get('/admin/orders', verifyjwt, verifyAdmin, async(req, res)=>{

      // const decodedEmail = req.decoded.email;
      // const query = {email: decodedEmail};
      // const user = await usersCollection.findOne(query);

      // if(user.role !== 'admin'){
      //   return res.status(403).send({message: 'forbidden access'});
      // }

      const query1 ={};
      const result = await ordersCollection.find(query1).toArray();
      res.send(result);
      
      
    })

    // Delete a perticular order by id
    app.delete('/admin/order/:id', verifyjwt, verifyAdmin, async(req, res) =>{
      // const decodedEmail = req.decoded.email;
      // const query = {email: decodedEmail};
      // const user = await usersCollection.findOne(query);

      // if(user.role !== 'admin'){
      //   return res.status(403).send({message: 'forbidden access'});
      // }

      const id = req.params.id;
      const query1 = {_id:ObjectId(id)};
      const delItem = await ordersCollection.deleteOne(query1);
      res.send(delItem);
      
      
    })


    // get all products
    app.get('/products', async(req, res) =>{
      const query = {};
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    })

    //make admin api
    app.put('/users/admin/:id', verifyjwt, verifyAdmin, async(req, res) => {

      // const decodeEmail = req.decoded.email;
      // const query = {email: decodeEmail};
      // const user = await usersCollection.findOne(query);

      // if(user?.role !== 'admin'){
      //   return res.status(403).send({message : 'Forbidden access'});
      // }

      const id = req.params.id;
      const filter = {_id:ObjectId(id)};
      const options = {upsert : true};
      const updatedDoc = {
        $set:{
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc, options);
      res.send(result);
    })

    //Delete single user api
    app.delete('/users/admin/:id', verifyjwt, verifyAdmin, async(req, res) => {
      // const decodeEmail = req.decoded.email;
      // const query = {email: decodeEmail};
      // const user = await usersCollection.findOne(query);

      // if(user?.role !== 'admin'){
      //   return res.status(403).send({message : 'Forbidden access'});
      // }

      const id = req.params.id;
      const query2 = {_id:ObjectId(id)};
      const result = await usersCollection.deleteOne(query2);
      res.send(result);

    })

    //payment api
    app.get('/orders/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id:ObjectId(id)};
      const result = await ordersCollection.findOne(query);
      res.send(result);
    })


    app.post("/create-payment-intent", async (req, res) => {

      const {price} = req.body;
      const amount = price * 100;
  
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        currency: "INR",
        amount: amount,
        description: 'Software development services',
        "payment_method_types": [
          "card"
        ]
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });


    // Insert payments details to mongodb database

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);

      // for update the orders collection
      const id = payment.orderId;
      const filter = {_id:ObjectId(id)};
      const updatedDoc = {
        $set:{
          paid:true,
          transactionId:payment.transactionId
        }
      }
      const updatedResult = await ordersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    //api for mail
    app.post("/send_mail", async(req, res) => {
      let mail = req.body;
      const {email, name, subject, phone, description} = mail;
      console.log(email);
      let transport = nodemailer.createTransport({
        host:'smtp.gmail.com',
        port:587,
        secure:false,
        auth:{
          user : process.env.GMAIL_USER,
          pass : process.env.GMAIL_PASS
        }
      })

      await transport.sendMail({
        from: email,
        to: 'dassamiran05@gmail.com',
        subject: subject,
        text:`<h1>${subject}</h1>`,
        html:`<div><p>${description}</p></div>`,
      })

      console.log("Message sent");
    })
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Car service server is running');
})

app.listen(port, () => {
  console.log(`Car server running on port ${port}`);
})