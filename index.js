const express = require('express')
const app = express()
const port = 4000
const axios = require('axios');
var CronJob = require('cron').CronJob;
var firebase = require("firebase/app")
var database = require("firebase/database")
require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.DATABASE_URL,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID
};

const appFb = firebase.initializeApp(firebaseConfig);
const databass = database.getDatabase(appFb);
const dbRef = database.ref(databass);

var job = new CronJob('* * * * *', function(){

    readDb();

} , null, true, 'Europe/Berlin');
job.start();

var jobAlive = new CronJob('00 12 * * *', function(){

    var configTelegram = {
        method: 'post',
        url: 'https://api.telegram.org/bot'+process.env.TELEGRAM_TOKEN+'/sendMessage?chat_id=5641643064&text=Alive',
        headers: {
        'Content-Type': 'text/plain'
        }
    };
    axios(configTelegram)
          .then(function (response) {
              console.log("Message sent");
          })
          .catch(function (error) {
              console.log(error);
          });
} , null, true, 'Europe/Berlin');
job.start();

const readDb = () =>{
    database.get(database.child(dbRef, `/`)).then((snapshot) => {
        releasesDb = snapshot.val();
        console.log(releasesDb);
        for(let key in releasesDb){
            setTimeout(getReleaseStats, 100, releasesDb, key);
        }
    }).catch((error) => {
      console.error(error);
    });
}

const getReleaseStats = (snapshot, key) =>{
        var config = {
            method: 'get',
            url: 'https://api.discogs.com/marketplace/stats/'+snapshot[key].id,
            headers: {
            'Content-Type': 'text/plain'
            }
        };
    
    axios(config)
          .then(function (response) {
              let numDiscogs = snapshot.forSale
              if(numDiscogs!=response.data.num_for_sale){
                sendTelegramMessage(snapshot);
              }
          })
          .catch(function (error) {
              console.log(error);
          });
}

const sendTelegramMessage = (snapshot)=>{
    var configTelegram = {
        method: 'post',
        url: 'https://api.telegram.org/bot'+process.env.TELEGRAM_TOKEN+'/sendMessage?chat_id=5641643064&text=Neues listing für '+ snapshot.title,
        headers: {
        'Content-Type': 'text/plain'
        }
    };
    axios(configTelegram)
          .then(function (response) {
              console.log("Message sent");
          })
          .catch(function (error) {
              console.log(error);
          });
}

app.get('/', (req, res) => {res.send("Alive")})

app.post('/add', (req, res) => {
    try{
        const postData = {
            id: parseInt(req.query.id),
            title: req.query.title,
            forSale: parseInt(req.query.forSale)
          };
        const newPostKey = database.push(database.child(database.ref(databass), '/')).key;

        const updates = {};
        updates['/' + newPostKey] = postData;
        database.update(database.ref(databass), updates);
        res.sendStatus(200)
    }catch(error){
        console.log(error);
        res.sendStatus(500);
    }
    
})

app.listen(process.env.PORT || 3000)