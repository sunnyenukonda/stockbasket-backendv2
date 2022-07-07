const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const app = express();

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const port = process.env.port || 8000;

app.use(express.json());
app.use(cors({
  origin: ["http://localhost:3000"],
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
  key: "userId",
  secret: "subscribe",
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: 60 * 60 * 24
  }
})
);

const db = mysql.createConnection({
  user: 'admin',
  host: 'stockbasketdb-1.c2gkj0kqqrjj.us-east-2.rds.amazonaws.com',
  password: 'password',
  database: 'stockbasket',
  port: 3306
});


app.post('/register', (req, res) => {

 const firstName = req.body.firstName;
 const lastName = req.body.lastName;
 const email = req.body.email;
 const password = req.body.password;

 db.query(
   "select * from users where email = ?;",
   email,
   (err, result) => {
     if(result.length > 0){
       res.send({loggedIn: false, message: 'Email ID already registered'})
     }else{
       bcrypt.hash(password,saltRounds, (err, hash) => {
         if(err){
           console.log(err);
         }

         db.query(
           "INSERT INTO users (firstname, lastname, email, password) VALUES (?,?,?,?);",
           [firstName, lastName, email, hash],
           (err, result) => {
             if(result != undefined){
               res.send({loggedIn: true, message: 'Success!'})
             }else{
               res.send({err: err});
             }
           }
         );
       })
     }
 });
});

app.get('/login',(req, res) => {
  if(req.session.user){
    res.send({loggedIn: true, user:req.session.user});
  }else{
    res.send({loggedIn: false});
  }
});

app.post('/login',(req, res) => {
 const email = req.body.email;
 const password = req.body.password;


  db.query(
    "select * from users where email = ?;",
    email,
    (err, result) => {
      if(err){
      res.send({err:err});
    }

      if(result.length > 0){
        bcrypt.compare(password, result[0].password, (error, response) =>{
          if(response) {
            req.session.user = result;
            res.send(result)
          }else{
            res.send({message: "wrong email/password"});
          }
        })
      }else{
        res.send({message: "User Not Found"});
      }

    }
  );
});

app.post('/updateStocks',(req, res) => {
 const selectedStocks = req.body.selectedStocks;
 const userId = req.body.userId;

  db.query(
    "select products from userStocks where userId = ? and is_deleted = 0;",
    userId,
    (err, result) => {
    if(err){
      return res.send({err:err});
    }

    if(result.length > 0){
      let selectData = [];
      result.forEach(element => {
            selectData.push(element.products)
      });

      let addArray = selectedStocks.filter(x => !selectData.includes(x));
      let deleteArray = selectData.filter(x => !selectedStocks.includes(x));

      if(deleteArray.length > 0){
        deleteArray.forEach(deleteItem => {
          db.query(
             "update userStocks SET is_deleted = 1 WHERE userId = ? and products = ?",
              [userId, deleteItem],
             (derror, dresults) => {
             if(derror){
               res.send({err:derror});

             }
           }
           )
        });
      }

      if(addArray.length > 0){
         db.query(
             'INSERT INTO userStocks (userId, products) VALUES ?',
             [addArray.map(stock => [userId, stock])],
             (aerror, aresults) => {
               if(aerror){
                res.send({err:aerror});
               }
             }
           );
      }

    }else if(selectedStocks.length > 0){
      db.query(
          'INSERT INTO userStocks (userId, products) VALUES ?',
          [selectedStocks.map(stock => [userId, stock])],
          (aerror, aresults) => {
            if(aerror){
             res.send({err:aerror});
            }
          }
        );


    }
    db.query(
      "select products from userStocks where userId = ? and is_deleted = 0;",
      userId,
      (perr, presult) => {
      if(perr){
       res.send({err:perr});
      }
      let data = [];
      if(presult.length > 0){

        presult.forEach(element => {
              data.push(element.products)
        });

      }
      res.send({products: data});
    });
  });
});


app.post('/getStocks',(req, res) => {
 const userId = req.body.userId;
 db.query(
   "select products from userStocks where userId = ? and is_deleted = 0;",
   userId,
   (perr, presult) => {
   if(perr){
      res.send({err:perr});
   }
   if(presult.length > 0){
     let data = [];
     presult.forEach(element => {
           data.push(element.products)
     });
      res.send({products: data});
   }else{
    res.send({products: []});
   }
 });
});

app.post('/logout',(req, res) => {
 req.session.destroy();
 res.send({res: 'Success!'});
});

app.get('/test',(req, res) => {
  res.send("working");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
