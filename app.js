// init .env
require('dotenv').config();

const express = require('express')
const cookieSession = require('cookie-session')
const passport = require('passport')

// set up web push to send notifications
const webpush = require('web-push')
webpush.setGCMAPIKey(process.env.FCM_KEY);
webpush.setVapidDetails('mailto:' + process.env.EMAIL, process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);

// load all database related stuff
require('./src/db')
require('./src/passport')

// create express server
const app = express()

// set up login sessions
const session = cookieSession({
  maxAge: 365 * 24 * 60 * 60 * 1000,
  keys: [process.env.COOKIE_KEY],
})

app.use(session)

// handle url parameters
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// initialize passport.js
app.use(passport.initialize())
app.use(passport.session())

// create the server and initialize socket.io
const server = require('http').createServer(app)
const io = require("socket.io")(server)

// handle routes
require('./src/logic')(app, io, session, webpush);

// Start the server on the given port
server.listen(process.env.PORT || 8080)