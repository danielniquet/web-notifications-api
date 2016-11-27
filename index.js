
const webpush = require('web-push');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const Datastore = require('nedb');


const db = new Datastore({
  filename: path.join(__dirname, 'subscription-store.db'),
  autoload: true
});

function getSubscriptionsFromDatabase() {
  return new Promise(function(resolve, reject) {
    db.find({}, function(err, docs) {
      if (err) {
        reject(err);
        return;
      }
      resolve(docs);
    })
  });
}

const app = express();
const http = require('http').Server(app);
const io = require("socket.io")(http);

app.use(express.static(path.join(__dirname,  'web-app')));
// app.use(express.static(path.join(__dirname,  'jekyll')));
app.use(bodyParser.json());
app.use(bodyParser());


var users=[];
io.on('connection',function(socket){  
  socket.on('get subscriptions',function(){
    console.log('get subscriptions socket')
    return getSubscriptionsFromDatabase()
    .then(function(subscriptions) {
      io.emit('get subscriptions',subscriptions); 
    })
  });
})


app.get("/",function(req,res){
    res.sendFile(__dirname + '/web-app/index.htm');
});
app.get("/samples",function(req,res){
    res.sendFile(__dirname + '/notification-examples/index.html');
});
// app.set('views', 'views') // specify the views directory
app.locals.basedir = __dirname + '/views';
// app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');





/**** START save-sub-api ****/
function saveSubscriptionToDatabase(subscription) {
  return new Promise(function(resolve, reject) {

    db.insert(subscription, function(err, newDoc) {
      if (err) {
        reject(err);
        return;
      }

      resolve(newDoc._id);
    });
  });
};

// This is the API that receives a push subscription and saves it.
/**** START save-sub-api-post ****/
app.post('/api/save-subscription/', function (req, res) {
/**** END save-sub-api-post ****/
  // Check the body has an subscription with at least an endpoint.
  if (!req.body || !req.body.endpoint) {
    // Not a valid subscription - return error.
    res.status(400);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      error: {
        id: 'no-endpoint',
        message: 'Subscription must have an endpoint.'
      }
    }));
    return;
  }

  return saveSubscriptionToDatabase(req.body)
  .then(function(subscriptionId) {
    getSubscriptionsFromDatabase()
      .then(function(subscriptions) {
        io.emit('get subscriptions',subscriptions); 
      })
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ data: { success: true, id: subscriptionId } }));
  })
  .catch(function(err) {
    res.status(500);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      error: {
        id: 'unable-to-save-subscription',
        message: 'The subscription was received but we were unable to save it to our database.'
      }
    }));
  });
});
/**** END save-sub-api ****/
app.get('/admin', function (req, res) {

  return getSubscriptionsFromDatabase()
  .then(function(subscriptions) {
    // res.setHeader('Content-Type', 'application/json');
    // res.send(JSON.stringify({ data: { subscriptions: subscriptions } }));
    // res.sendFile(__dirname + '/web-app/admin.htm',{ data: { subscriptions: subscriptions } });
      res.render('admin', { data: { subscriptions: subscriptions } })



  })
  .catch(function(err) {
    res.status(500);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      error: {
        id: 'unable-to-get-subscriptions',
        message: 'We were unable to get the subscriptions from our database.'
      }
    }));
  });
})


app.all('/api/get-subscriptions/', function (req, res) {
  // TODO: This should be secured / not available publicly.
  //       this is for demo purposes only.

  return getSubscriptionsFromDatabase()
  .then(function(subscriptions) {
    if (req.method === 'GET') {
      console.log(subscriptions);
      const tableHeading = '<tr><th>ID</th><th>Endpoint</th><th>p256dh Key</th><th>Auth Secret</th></tr>';
      let tableContent = '';
      for (let i = 0; i < subscriptions.length; i++) {
        const subscription = subscriptions[i];
        tableContent += '<tr>\n';
        tableContent += '<td>' + subscription._id + '</td>\n';
        tableContent += '<td>' + subscription.endpoint + '</td>\n';

        if (subscription.keys && subscription.keys.p256dh) {
          tableContent += '<td>' + subscription.keys.p256dh + '</td>\n';
        } else {
          tableContent += '<td>No Key</td>\n';
        }

        if (subscription.keys && subscription.keys.auth) {
          tableContent += '<td>' + subscription.keys.auth + '</td>\n';
        } else {
          tableContent += '<td>No Auth</td>\n';
        }

        tableContent += '</tr>\n\n';
      }
      res.send('<table>' + tableHeading + tableContent + '</table>');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ data: { subscriptions: subscriptions } }));
    }
  })
  .catch(function(err) {
    res.status(500);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      error: {
        id: 'unable-to-get-subscriptions',
        message: 'We were unable to get the subscriptions from our database.'
      }
    }));
  });
});

/**
 *
 *
 */

app.post('/api/remove-subscription/', function (req, res) {
  if (!req.body || !req.body.id) {
    // Not a valid subscription - return error.
    res.status(400);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      error: {
        id: 'no-endpoint',
        message: 'Subscription must have an endpoint.'
      }
    }));
    return;
  }else{
    db.remove({ _id: req.body.id }, {}, function (err, subscriptions) { 
      return getSubscriptionsFromDatabase()
      .then(function(subscriptions) {
        io.emit('get subscriptions',subscriptions); 
      })
    });
  }
})


app.all('/api/trigger-push-msg/:title/:msg', function (req, res) {
  // TODO: This endpoint should be secured, restricting access

  /**** START web-push-gcm 
  const gcmServerKey = 'AIzaSyC5itnz9jHmpvQRhq8sJUCFUy2SYUPanGs';
  webpush.setGCMAPIKey(gcmServerKey);
  /**** END web-push-gcm ****/

  /**** START web-push-vapid ****/
  const vapidKeys = {
    publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
    privateKey: 'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls'
  };

  webpush.setVapidDetails(
    'mailto:web-push-book@gauntface.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  /**** END web-push-vapid ****/


  return getSubscriptionsFromDatabase()
  .then(function(subscriptions) {
    const sendPromises = subscriptions.map(function(subscription) {
      const payload = req.params.title+'|'+req.params.msg

      if(req.body.ids.indexOf(subscription._id)>-1){
        return webpush.sendNotification(subscription, payload)
        .then(function() {
          console.log('Subscription was valid.',subscription);
        },function(err) {
          console.log('Subscription is no longer valid.');
        });
      }else{
        return;

      }

      
    });

    return Promise.all(sendPromises);
  })
  .then(() => {
    if (req.method === 'GET') {
      res.send('<h1>Everything was sent</h1>');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ data: { success: true } }));
    }
  })
  .catch(function(err) {
    res.status(500);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      error: {
        id: 'unable-to-get-subscriptions',
        message: 'We were unable to get the subscriptions from our database.'
      }
    }));
  });
});

const server = http.listen(9012, function () {
  console.log('Running on http://localhost:' + server.address().port);
});
