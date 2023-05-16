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

    var configOpus = {
        method: 'get',
        url: 'https://api.discogs.com/marketplace/stats/8357188',
        headers: {
        'Content-Type': 'text/plain'
        }
    };
    var configStay = {
        method: 'get',
        url: 'https://api.discogs.com/marketplace/stats/8357188',
        headers: {
        'Content-Type': 'text/plain'
        }
        };
    var configIamLegion = {
        method: 'get',
        url: 'https://api.discogs.com/marketplace/stats/8357188',
        headers: {
        'Content-Type': 'text/plain'
        }
        };
    var configTelegram = {
        method: 'post',
        url: 'https://api.telegram.org/bot'+process.env.TELEGRAM_TOKEN+'/sendMessage?chat_id=5641643064&text=test',
        headers: {
        'Content-Type': 'text/plain'
        }
    };

            const appFb = firebase.initializeApp(firebaseConfig);
            const databass = database.getDatabase(appFb);

            const dbRef = database.ref(databass);
            const readDb = () =>{
                database.get(database.child(dbRef, `/`)).then((snapshot) => {
                    console.log(snapshot.val())
                }).catch((error) => {
                  console.error(error);
                });
            }

app.get('/', (req, res) => {})

const getReleaseStats = () =>{
    axios(configOpus)
          .then(function (response) {
              console.log(JSON.stringify(response.data));
          })
          .catch(function (error) {
              console.log(error);
          });
}

var job = new CronJob('* * * * *', function(){
  axios(configOpus)
      .then(function (response) {
          console.log(JSON.stringify(response.data));
      })
      .catch(function (error) {
          console.log(error);
      });



  axios(configTelegram)
      .then(function (response) {
          console.log(JSON.stringify(response.data));
      })
      .catch(function (error) {
          console.log(error);
      });
    readDb();
} , null, true, 'Europe/Berlin');
job.start();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})