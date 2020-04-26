const express = require('express')
const passport = require('passport')

const mongoose = require('mongoose')
const User = mongoose.model('User')
const Token = mongoose.model('Token')
const Notification = mongoose.model('Notification')
const Subscription = mongoose.model('Subscription')

const path = require('path')

module.exports = (app, io, session, webpush) => {
  // serve static pages
  app.use(express.static(path.resolve(__dirname + '/../public')));

  // serve main pages (either landing or app)
  app.get('/', (req, res) => {
    if(req.user) {
      res.sendFile(path.resolve(__dirname + '/../views/index.html'))
    } else {
      res.sendFile(path.resolve(__dirname + '/../views/landing.html'))
    }
  });

  // post route for sending new messages to a specific token
  app.post('/:token', async (req, res) => {
    const token = await Token.findById(req.params.token)

    // check if token is valid
    if (!token) {
      res.status(400).send('Token "' + req.params.token + '" is not associated with any notify.uno account\n')
      return
    }

    // create new notification and save to db
    const notification = await new Notification({
      userId: token.userId, 
      token: token._id,
      message: Object.keys(req.body)[0]
    }).save()

    // send notification via socket
    io.to(token.userId).emit("notification", notification)

    // load all active subscriptios of the user
    const subscriptions = await Subscription.find({ userId: token.userId })

    // check if the user has a background service or has the page open
    if(subscriptions.length === 0 && !io.sockets.adapter.rooms[token.userId]) {
      res.status(404).send('Please stay on notify.uno or enable background notifications')
      return
    }

    // add all subscriptions to send to an array
    const notificationsToSend = []
    for(var i = 0; i < subscriptions.length; i++) {
      const subscription = subscriptions[i]
      const subscriptionBody = subscription.body

      notificationsToSend.push(webpush.sendNotification(subscriptionBody, JSON.stringify(notification)))
    }

    // send all notifications and wait until they have been sent
    await Promise.all(notificationsToSend).catch(function(error){
      console.log(error)
  })

    res.status(200).end()
  })

  // initiate google sign in
  app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }))

  // handle callback from google
  app.get('/auth/google/callback', passport.authenticate('google'), (req, res) => {

    // authentication was probably successful so redirect to the main page
    res.redirect('/')
  })

  // log out the user and clear session
  app.get('/auth/logout', (req, res) => {
    req.logout()
    
    res.redirect('/')
  })

  // get the main important things
  app.get('/api/main', async (req, res) => {
    // check if user is valid
    if (!req.user) {
      res.status(401).json({ status: 'Unauthorized' })
      return
    }

    const tokens = await Token.find({ userId: req.user._id })
    const notifications = await Notification.find({ userId: req.user._id }).sort('-createdAt').limit(100)
    const subscriptions = await Subscription.find({ userId: req.user._id }).sort('-createdAt')

    res.json({ status: 'successful', data: { 
      user: req.user,
      tokens,
      notifications,
      subscriptions
    } })
  })

  // get current user details
  app.get('/api/user', (req, res) => {
    // check if user is valid
    if (!req.user) {
      res.status(401).json({ status: 'Unauthorized' })
      return
    }

    res.json({ status: 'successful', data: req.user })
  })

  // get all tokens of a user
  app.get('/api/token', async (req, res) => {
    // check if user is valid
    if (!req.user) {
      res.status(401).json({ status: 'Unauthorized' })
      return
    }

    const token = await Token.find({ userId: req.user._id })

    res.json({ status: 'successful', data: token })
  })

  // get all notifications of a user
  app.get('/api/notification', async (req, res) => {
    // check if user is valid
    if (!req.user) {
      res.status(401).json({ status: 'Unauthorized' })
      return
    }

    const notifications = await Notification.find({ userId: req.user._id }).sort('-createdAt').limit(100)

    res.json({ status: 'successful', data: notifications })
  })

  // get all users subscription keys
  app.get('/api/subscription', async (req, res) => {
    // check if user is valid
    if (!req.user) {
      res.status(401).json({ status: 'Unauthorized' })
      return
    }

    const subscriptions = await Subscription.find({ userId: req.user._id }).sort('-createdAt')

    res.json({ status: 'successful', data: subscriptions })
  })

  // add a subscription key
  app.post('/api/subscription', async (req, res) => {
    // check if user is valid
    if (!req.user) {
      res.status(401).json({ status: 'Unauthorized' })
      return
    }

    const subscription = await new Subscription({
      userId: req.user._id,
      name: req.body.name,
      body: JSON.parse(req.body.body)
    }).save()

    res.json({ status: 'successful', data: subscription })
  })

  // add a subscription key
  app.delete('/api/subscription', async (req, res) => {
    // check if user is valid
    if (!req.user) {
      res.status(401).json({ status: 'Unauthorized' })
      return
    }

    await Subscription.deleteOne({ userId: req.user._id, 'body.endpoint': req.body.endpoint })

    res.json({ status: 'successful' })
  })


  // get some basic usage statistics
  app.get('/api/statistics/:key', async (req, res) => {

    if (!process.env.STATISTICS_KEY) {
      res.status(400).json({ status: 'Statistics disabled' })
      return
    }

    // check if key is valid
    if (!req.params.key || req.params.key != process.env.STATISTICS_KEY) {
      res.status(401).json({ status: 'Unauthorized' })
      return
    }

    const userCount = await User.countDocuments({})
    const tokenCount = await Token.countDocuments({})
    const notificationCount = await Notification.countDocuments({})
    const subscriptionCount = await Subscription.countDocuments({})

    
    res.json({ status: 'successful', data: { 
      userCount, 
      tokenCount,
      notificationCount, 
      subscriptionCount }})
  })


  // Handle socket.io
  io.on('connection', socket => {
    // required workaround to get the cookie session
    let cookieString = socket.request.headers.cookie;
    let req = { connection: {encrypted: false}, headers: {cookie: cookieString} }
    let res = { getHeader: () =>{}, setHeader: () => {} }

    // decrypt the session
    session(req, res, () => {
      // get the users id from the session
      const userId = req.session.passport.user

      // join a socket.io room by the user id
      socket.join(userId)
    })
  })
}