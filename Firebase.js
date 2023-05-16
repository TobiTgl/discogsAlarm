// Import the functions you need from the SDKs you need
var firebase = require("firebase/app")
var database = require("firebase/database")
require('dotenv').config();
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.DATABASE_URL,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const databass = database.getDatabase(app);

const dbRef = database.ref(databass);
const readDb = () =>{
    get(child(dbRef, `/`)).then((snapshot) => {
        console.log(snapshot.val())
    }).catch((error) => {
      console.error(error);
    });
}