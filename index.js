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
        url: 'https://www.doctolib.de/availabilities.json?visit_motive_ids=4322286&agenda_ids=476079-476080&practice_ids=187855&insurance_sector=private&telehealth=false&limit=5&start_date=2023-07-16' + slicedeDate,
        headers: {
            'Content-Type': 'application/json',
            'Cookie': '__cf_bm=XkC_lRD97KnhrZSBvJTmEMtpYU4lyfok0wAFkLuIPFU-1689585459-0-Abf1iTvzyKrxdKx5i/TyhcUQBLuMo7utjLvFR0+fKXEGBly0FmTe5L0TMlo8ieoGtgOkxXTXbAExUkRDHR12DsG+hbq9lIww+CMHLmdQ7AB0; _doctolib_session=ivG629i4BkcFf9WORsJYwfLLGRHf0Mw1KBseqnH%2FrXR6RbhCHxoaDg2p%2FPIDU69eq4TxmVOwMPu%2BXMpVSfWdnUu9QrP%2FkGlrwKILigaPzhYd3Jtr%2B5P62r4JnBTfaRdTeS68T5F7CDVIFnLhYPBXWyw4FdqUc90a1xZRHPtko7AsAwtc9PiOcnhUkzSwlvErKorc03%2BvlPblfpAC5JSKdxGTF%2Fm9DKscLqc7NBSLlbTw9HeLl1rXaLyVBc%2BMBrzBtTo2s4P6yLcsAbcQUhnAOsaoM1Xcrxz8BO6zU%2BnHsFdV1lE6mHyzqenpBcGp9UjoeciCqU61Px%2FhhT0Qlxxjjtv40QLSNz1toF9qahWb3kBl28WYuvFkXGlauhPuznaJ4i6tD4%2F2c%2BK1NLHAa6%2Bbp9JALJNYgDqutb2r92WFvA1NLCkp6n1EnZU%3D--grGEeNih%2Bm8mx%2F%2F5--B92ZSN32ksocFF51qhHdnA%3D%3D; esid=UjWU6ImtQDXAVyiD9Hbs2qvE; ssid=ub00unk-itFQhFjnoDga',
            'X-Csfr-Token' : '7SLpWBW31IjUMzXksmGOMjrZ6YaBoBQWXSkAu+7OW5NKifsAF09FWDXoUJ/NW9SQd4mvtCzQWeVMKKK8FtoNZQ=='
        }
    };

    axios(configDoclib)
        .then(function (response) {
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