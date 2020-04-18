const mongoose = require('mongoose')
const { Schema } = mongoose

// connect to database
mongoose.connect(process.env.MONGODB, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
  keepAlive: true,
})

// create user schema
const userSchema = new Schema({
  googleId: {
    type: String,
    required: true
  },
  name: {
    givenName: {
      type: String,
      required: true
    },
    familyName: {
      type: String,
      required: true
    }
  },
  email: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  }
}, { timestamps: true })

mongoose.model('User', userSchema)

// create token schema
const tokenSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: String
}, { timestamps: true })

mongoose.model('Token', tokenSchema)

// create notifciation schema
const notificationSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token',
    required: true
  },
  message: {
    type: String,
    required: true
  }
}, { timestamps: true })

mongoose.model('Notification', notificationSchema)

// create subscription schema
const subscriptionSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum : ['active', 'inactive', 'revoked'],
    default: 'active'
  },
  name: {
    type: String,
    required: true
  },
  body: {
    type: Object,
    required: true
  }
}, { timestamps: true })

mongoose.model('Subscription', subscriptionSchema)