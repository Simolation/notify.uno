const passport = require('passport')
const mongoose = require('mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const User = mongoose.model('User')
const Token = mongoose.model('Token')

// save the user id in the session
passport.serializeUser((user, done) => {
  done(null, user.id)
})

// get the current logged in user
passport.deserializeUser((id, done) => {
  User.findById(id).then(user => {
    done(null, user)
  })
})

// set up the google authentication
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_ID,
  clientSecret: process.env.GOOGLE_SECRET,
  callbackURL: process.env.DOMAIN + 'auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {

  // check if user is already registered
  const user = await User.findOne({ googleId: profile.id })
  if(user) {

    // user is already registered
    done(null, user)
  } else {

    // else add new user to database
    const newUser = await new User({
      googleId: profile.id,
      name: {
        givenName: profile._json.given_name,
        familyName: profile._json.family_name
      },
      email: profile._json.email,
      avatar: profile._json.picture
    }).save()

    // create initial token for the new user
    await new Token({
      userId: newUser._id,
      name: 'Default token'
    }).save()

    done(null, newUser)
  }
}))