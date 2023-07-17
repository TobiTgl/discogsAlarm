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
            'authority': 'www.doctolib.de',
            'accept': 'application/json',
            'accept-language': 'de-DE,de;q=0.9',
            'cache-control': 'no-cache',
            'content-type': 'application/json; charset=utf-8',
            'cookie': 'ssid=c114000win-0MhNAJpcDpqI; esid=WkUUGaU649PrfnikPlVcyCk1; __cf_bm=iamWlLasY304Eq48.JyPFvIV1.r_I.m4F2cdTbDdZTg-1689589603-0-Ac3ILCjdcB+VgvtzWAGVh/bqjUehJG3UVRUGvLzELlZLNYL/LqrRnc4gh1F4nLpxPOalRQJVpSE8HM/gZQbimZWrdPQCxjjVPiMmrZDtYPFu; didomi_token=eyJ1c2VyX2lkIjoiMTg5NjM2MzUtODFhMy02MzhlLTgyN2YtYzQ4Zjk1NmM4OWM5IiwiY3JlYXRlZCI6IjIwMjMtMDctMTdUMTA6MjY6NDQuMjU0WiIsInVwZGF0ZWQiOiIyMDIzLTA3LTE3VDEwOjI2OjQ0LjI1NFoiLCJ2ZW5kb3JzIjp7ImRpc2FibGVkIjpbImM6ZGlkb21pLWZZUEJZeFdhIiwiYzpkb2N0b2xpYm4tV3A4N0NwWEEiLCJjOmRvY3RvbGliYS10Z3RiM1c4UCJdfSwicHVycG9zZXMiOnsiZGlzYWJsZWQiOlsiYW5hbHl0aWNzLU5HcXhXYm1uIiwiYW5hbHl0aWstTjJaSDlCcVEiLCJkaXNwbGF5dGEtVjhrTWVuWWEiLCJkaXNwbGF5dGEtVnJQUFZuSGgiXX0sInZlcnNpb24iOjJ9; euconsent-v2=CPvDS0APvDS0AAHABBENDNCgAAAAAAAAAAAAAAAAAAAA.YAAAAAAAAAAA; _doctolib_session=9W%2BVF2bdjI6ncuTejZJc6T47caXRTN6hgVFVQv9cp1zyyhNK7vvi1TV9BE7olZ6og4hjAq9zdPmm7nZyjEV1GKBj378kJAg5SYcrJInf6Svc1t1V6e07QC%2B%2Fev7vboJ9rT4QbyTbsRKYLN%2B2cvHC3ApSakuUaE8o9U1BbneqUvL3vn3laHyJ6daIUyuv%2FVFy0XPmiMnj30zqQCJMRGhjWq5wjZXrpN3AT0LEKgTlXaiVNEwcC7FhCPl%2FVPByThBc61Ghw6NKrKtDWRsCWls1%2F6uVs1EsercUbqgTtUnyBx%2BII1fX5MJR6t%2BJJyXzgzcseOvqM6t96iuErKJkRGCEDy00mSkrcfoSuxfKbQQw4tHjVgu7j7cW1a48bM2AzFfDHXInm4LTejE8dY%2BljKuNrqxX72XRPgX6Z7USn22DlzyBCHEyn3i5VNE%3D--oOWT01yHMqjUs7pb--TG0FtqoQFAfTetHh8BSIwA%3D%3D',
            'pragma': 'no-cache',
            'referer': 'https://www.doctolib.de/medizinisches-versorgungszentrum-mvz/blaustein/blausteinklinik-hautzentrum-ulm/booking/availabilities?specialityId=1289&telehealth=false&placeId=practice-187855&insuranceSector=public&insuranceSectorEnabled=true&motiveCategoryIds%5B%5D=141299&motiveIds%5B%5D=4322286&practitionerId=NO_PREFERENCE',
            'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            'x-csrf-token': 'Bcqqcco7lDeY2t3sk9yj6IBVk7qdKoVC3qpeUFP8GltBwN4atSmB/1lsw61Hv3vDSOXpKnUaLfjfg0MU8TLJ6A=='
        }
    };

    axios(configDoclib)
        .then(function (response) {
            if (response.data.next_slot != undefined) {
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