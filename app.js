//jshint esversion:6
//Using passport, passport-local, passport-local-mongoose, express-session
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport'); //also needed to install passport-local
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'Our little secret.',
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(
  'mongodb+srv://admin-abinav:Testing123@cluster0.fkveg.mongodb.net/userDB',
  { useNewUrlParser: true, useUnifiedTopology: true }
);
mongoose.set('useCreateIndex', true); //Since a deprecation warning has occured.

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String, //Only when using google auth
  secret: String,
});

userSchema.plugin(passportLocalMongoose); //hash and salt password & save user into MongoDB
userSchema.plugin(findOrCreate); //for func used in auth with google

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());//generates func that is used by passport to serialize users into session.
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/secrets',
      userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo', //add this, since deprecation warning
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get('/', (req, res) => {
  res.render('home');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/submit', function (req, res) {
  if (req.isAuthenticated()) {
    res.render('submit');
  } else {
    res.redirect('/login');
  }
});

app.post('/submit', function (req, res) {
  const submittedSecret = req.body.secret;

  User.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function () {
          res.redirect('/secrets');
        });
      }
    }
  });
});

app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get(
  '/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  }
);

// app.get('/secrets', function(req, res) {
//   //Secrets is rendered as long as the user is loged in. A cookie is created to check user is loged in or not.
//   if(req.isAuthenticated()) {
//     res.render('secrets')
//   }else {
//     res.redirect('/login')
//   }
// })

app.get('/secrets', function (req, res) {
  User.find({ secret: { $ne: null } }, function (err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render('secrets', { usersWithSecrets: foundUsers });
      }
    }
  });
});

app.post('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

app.post('/register', (req, res) => {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect('/register');
      } else {
        passport.authenticate('local')(req, res, function () {
          res.redirect('/secrets');
        });
      }
    }
  );
});

app.post('/login', (req, res) => {
  //from the passport website, Inside log In topic
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate('local')(req, res, function () {
        res.redirect('/secrets');
      });
    }
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server is running at port 3000');
});

// //-------------------- Lib requires --------------------
// require("dotenv").config();
// const express = require("express");
// const bodyParser = require("body-parser");
// const ejs = require("ejs");
// const mongoose = require("mongoose");
// // const encrypt = require("mongoose-encryption");
// // const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
//
// //-------------------- basics --------------------
// const app = express();
// app.use(express.static("public"));
// app.set("view engine", "ejs");
// app.use(bodyParser.urlencoded({ extended: true }));
//
// //-------------------- Mongoose --------------------
// mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true, useUnifiedTopology: true });
// const userScheme = new mongoose.Schema({
//     email: String,
//     password: String,
// });
//
// // userScheme.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });
// const User = new mongoose.model("User", userScheme);
//
// //-------------------- Routes --------------------
// app.get("/", (req, res) => {
//     res.render("home");
// });
//
// app.get("/login", (req, res) => {
//     res.render("login");
// });
//
// app.get("/register", (req, res) => {
//     res.render("register");
// });
//
// app.post("/register", (req, res) => {
//     bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//       const newUser = new User({
//           email: req.body.username,
//           // password: md5(req.body.password),
//             password: hash,
//           });
//
//       newUser.save((e) => {
//           if (e) {
//               res.render(e);
//           } else {
//               res.render("secrets");
//           }
//       });
//     });
//
// });
//
// app.post("/login", (req, res) => {
//     const userName = req.body.username;
//     // const password = md5(req.body.password);
//     const password = req.body.password;
//
//     User.findOne({ email: userName }, (e, foundUser) => {
//         if (e) {
//             res.send(e);
//         } else {
//             if (foundUser) {
//               bcrypt.compare(password, foundUser.password, function(err, result) {
//                 if(result === true) {
//                   res.render("secrets");
//                 }
//               });
//             } else {
//                 res.send("Username does not exists");
//             }
//         }
//     });
// });
//
// //-------------------- Listen Route --------------------
// app.listen(3000, () => {
//     console.log("Server is running at port 3000");
// });

// //jshint esversion:6
// // require('dotenv').config()
// const express = require("express");
// const bodyParser = require('body-parser');
// const ejs = require('ejs');
// const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption');
//
// const app = express();
//
// app.use(express.static('public'));
// app.set('view engine', 'ejs');
// app.use(bodyParser.urlencoded({extended: true}));
//
// mongoose.connect('mongodb://localhost:27017/userDB', { useNewUrlParser: true, useUnifiedTopology: true });
//
// const userSchema = new mongoose.Schema ({
//   email: String,
//   password: String
// });
//
// const secret = "Thisisourlittlesecret.";
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });
//
// const User = new mongoose.model('User', userSchema);
//
// app.get('/', function(req, res) {
//   res.render('home')
// })
//
// app.get('/register', function(req, res) {
//   res.render('register');
// })
//
// app.get('/login', function(req, res) {
//   res.render('login');
// })
//
// app.get('/logout', function(req, res) {
//   res.render('home')
// })
//
// app.post('/register', function(req, res) {
//   const newUser = new User({
//     email: req.body.username,
//     password: req.body.password
//   });
//
//   newUser.save(function(err) {
//     if(err) {
//       console.log(err);
//     }else {
//       res.render('secrets')
//     }
//   })
// })
//
// app.post('/login', function(req, res) {
//     const username = req.body.username;
//     const password = req.body.password;
//
//     User.findOne({email: username}, function(err, foundUser) {
//       if(err) {
//         console.log(err);
//       }else {
//         if(foundUser) {
//           if(foundUser.password === password) {
//             res.render('secrets')
//           }else {
//             console.log("Username does not exits");
//           }
//         }
//       }
//     })
// })
//
// app.listen(3000, function() {
//   console.log("Server has started on port 3000");
// })
