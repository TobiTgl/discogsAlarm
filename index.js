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
    checkDoclibDatesBlaustein();


} , null, true, 'Europe/Berlin');
job.start();

var jobAlive = new CronJob('00 12 * * *', function(){

    var configTelegram = {
        method: 'post',
        url: 'https://api.telegram.org/bot'+process.env.TELEGRAM_TOKEN+'/sendMessage?chat_id=5641643064&text=Läuft',
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
            setTimeout(getReleaseStats, 1000, releasesDb[key], key);
        }
    }).catch((error) => {
      console.error(error);
    });
}

const getReleaseStats = (snapshot, key) =>{
        var config = {
            method: 'get',
            url: 'https://api.discogs.com/marketplace/stats/'+snapshot.id,
            headers: {
            'Content-Type': 'text/plain',
            'Authorization': 'Discogs key='+process.env.DISCOGS_KEY+', secret='+process.env.DISCOGS_SECRET
            }
        };
    
    axios(config)
          .then(function (response) {
              let numDiscogs = snapshot.forSale
              if(numDiscogs!=response.data.num_for_sale){
                  if(numDiscogs<response.data.num_for_sale){
                    sendTelegramMessage('Neues listing für '+ snapshot.title);
                  }
                updateSaleCounter(snapshot, response, key);
              }
          })
          .catch(function (error) {
              console.log(error);
          });
}

const sendTelegramMessage = (telegramMessage)=>{
    var configTelegram = {
        method: 'post',
        url: 'https://api.telegram.org/bot'+process.env.TELEGRAM_TOKEN+'/sendMessage?chat_id=5641643064&text='+ telegramMessage,
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

const updateSaleCounter = (snapshot, response, key)=>{
    const postData = {
        id: snapshot.id,
        title: snapshot.title,
        forSale: response.data.num_for_sale,
      };

    const updates = {};
    updates['/' + key] = postData;
    database.update(database.ref(databass), updates);
}

const checkDoclibDatesBlaustein = ()=> {
    let date = new Date().toJSON();
    let slicedeDate = date.slice(0, 10);
    var configDoclib = {
        method: 'get',
        url: 'https://www.doctolib.de/availabilities.json?visit_motive_ids=4322286&agenda_ids=476079-476080&practice_ids=187855&insurance_sector=private&telehealth=false&limit=5&start_date='+slicedeDate,
        headers: {
            'Content-Type': 'text/plain',
            'Cookie': '__cf_bm=575tiWlYlpWZnloowgam1rZlQdNgN0YpswkCsjSn6uw-1689588661-0-AaDYtjyKTweSieIGbzyLs2UA6E5p4i422+jG6AJrRmH2gi214JDW8VJP9p8VHWtcLJKvWynVwVHUxgPI6LJqZKo7hFGEmje/rdlCSjtH9J7k;ssid=ub00unk-nLAXiFG3oFN6; path=/; expires=Sat, 17 Aug 2024 10:13:01 GMT; secure;esid=-u1aoPLxAnJiYJxrTM_d4Aoc; path=/; secure;_doctolib_session=InVW%2FLkJNMLUfZJGvE%2FrDQiCjgCLnoCndF9mbyuALMnUbjBASkcLTF1Ise9u%2BBUqzork016AOADK929MB3lnjH1BL1Y8m9T6U%2FtO2cKVtbFIvMDiL6nwPWcSajBvVJENoc2bQTVPMqqsxqzeu99ynu5tpHj42fAD5FptcHntcjQUizBkudGs3zsRjk1ZK7Vu1mw8kmcjQKwr5af8GWcyMYfnXX0d2SyB%2BMYnd%2BcvG8Sz0qeHsSLPdOMwa7VGqF1qff1uacFHaHCSEF5pfvPxXjuVWc5aunB96gn4IdnDt7AwAQpIeN0lv3lIbinDcv6bbJSXexvQu8jzeJDQvCzZdcnAcIsDsRL8wKRNACrsGQ40dKuCFsX%2FORMC2BTpCtWPiGs5Ns4ogHTLo0BLLjsps4ob3NxGRRc8w3tZ7RtIFk28qMxr4BSb%2Faw%3D--Q9J1lK0Bm9rVAUS7--SkB8kWhpVeMRdvE2ZpAVzw%3D%3D',
        }
    };

    axios(configDoclib)
        .then(function (response) {
            console.log(response)
            if (response.data.next_slot != undefined) {
                console.log(response.data.next_slot);
                sendTelegramMessage('BlausteinKlinik next slot: ' + response.data.next_slot);
            }
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