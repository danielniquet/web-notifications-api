const pushCheckbox = document.querySelector('.js-push-toggle-checkbox');
const socket = io();

var app = angular.module('home',[]);
app.controller('home', function ($scope) {

  
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length,c.length);
        }
    }
    return "";
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}



function registerServiceWorker() {
  /**** START register-sw ****/
  return navigator.serviceWorker.register('service-worker.js')
  .then(function(registration) {
    console.log('Service worker successfully registered.');
    $('#myid').text(getCookie('_xidx'))
    return registration;
  })
  .catch(function(err) {
    console.error('Unable to register service worker.', err);
  });
  /**** END register-sw ****/
}

// This is just to make sample code eaier to read.
// TODO: Move into a variable rather than register each time.
function getSWRegistration() {
  return navigator.serviceWorker.register('service-worker.js');
}

/**** START request-permission ****/
function askPermission() {
  return new Promise(function(resolve, reject) {
    const permissionResult = Notification.requestPermission(function(result) {
      resolve(result);
    });

    if (permissionResult) {
      permissionResult.then(resolve, reject);
    }
  })
  .then(function(permissionResult) {
    if (permissionResult !== 'granted') {
      throw new Error('We weren\'t granted permission.');
    }
  });
}
/**** END request-permission ****/

function unsubscribeUserFromPush() {
  return registerServiceWorker()
    .then(function(registration) {
      // Service worker is active so now we can subscribe the user.
      return registration.pushManager.getSubscription();
    })
    .then(function(subscription) {
      if (subscription) {
        // console.log(subscription)
        sendUnubscriptionToBackEnd(getCookie('_xidx'),subscription)
        document.cookie = "_xidx=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
        $('#myid').text('')

        return subscription.unsubscribe();
      }
    })
    .then(function(subscription) {
        // $('#myid').text('')

      pushCheckbox.disabled = false;
      pushCheckbox.checked = false;
    })
    .catch(function(err) {
      console.error('Failed to subscribe the user.', err);
      pushCheckbox.disabled = Notification.permission === 'denied';
      pushCheckbox.checked = false;
    });
}


/**** START send-subscription-to-server ****/
function sendUnubscriptionToBackEnd(_id,subscription) {
  return fetch('/api/remove-subscription/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body:JSON.stringify({id:_id})
  })
}
/**** END send-subscription-to-server ****/

/**** START send-subscription-to-server ****/
function sendSubscriptionToBackEnd(subscription) {
  return fetch('/api/save-subscription/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(subscription)
  })
  .then(function(response) {
    if (response.status !== 200) {
      // Bad server response
      throw new Error('Bad status code from server.');
    }

    return response.json();
  })
  .then(function(responseData) {
    if (!(responseData.data && responseData.data.success)) {
      throw new Error('Bad response from server.');
    }else{
      document.cookie = "_xidx="+ responseData.data.id+"; expires=Thu, 18 Dec 2033 12:00:00 UTC";
      $('#myid').text(getCookie('_xidx'))

    }
  });
}
/**** END send-subscription-to-server ****/

/**** START subscribe-user ****/
function subscribeUserToPush() {
  return getSWRegistration()
  .then(function(registration) {
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
      )
    };

    return registration.pushManager.subscribe(subscribeOptions);
  })
  .then(function(subscription) {
    console.log('Received subscription: ', JSON.stringify(subscription));
    $('#myid').text(getCookie('_xidx'))

    return subscription;
  });
}
/**** END subscribe-user ****/

function setUpPush() {
  return registerServiceWorker()
  .then(function(registration) {
    if (Notification.permission === 'denied') {
      console.warn('The notification permission has been blocked. Nothing we can do.');
      return;
    }else{
      subscribeUserToPush()
    }

    pushCheckbox.addEventListener('change', function(event) {
      // Disable UI until we've handled what to do.

      event.target.disabled = true;

      if (event.target.checked) {
        // Just been checked meaning we need to subscribe the user
        // Do we need to wait for permission?
        let promiseChain = Promise.resolve();
        if (Notification.permission !== 'granted') {
          promiseChain = askPermission();
        }


        promiseChain
          .then(subscribeUserToPush)
          .then(function(subscription) {
            if (subscription) {
              return sendSubscriptionToBackEnd(subscription)
              .then(function() {
                return subscription;
              });
            }

            return subscription;
          })
          .then(function(subscription) {
            // We got a subscription AND it was sent to our backend,
            // re-enable our UI and set up state.
            pushCheckbox.disabled = false;
            pushCheckbox.checked = subscription !== null;
          })
          .catch(function(err) {
            console.error('Failed to subscribe the user.', err);

            // An error occured while requestion permission, getting a
            // subscription or sending it to our backend. Re-set state.
            pushCheckbox.disabled = Notification.permission === 'denied';
            pushCheckbox.checked = false;
          });
      } else {
        // Just been unchecked meaning we need to unsubscribe the user
        unsubscribeUserFromPush();
      }
    });

    if (Notification.permission !== 'granted') {
      // If permission isn't granted than we can't be subscribed for Push.
      pushCheckbox.disabled = false;
      return;
    }

    return registration.pushManager.getSubscription()
    .then(function(subscription) {
      pushCheckbox.checked = subscription !== null;
      pushCheckbox.disabled = false;
    });
  })
  .catch(function(err) {
    console.log('Unable to register the service worker: ' + err);
  });
}

window.onload = function() {
  /**** START feature-detect ****/
  if (!('serviceWorker' in navigator)) {
    // Service Worker isn't supported on this browser, disable or hide UI.
    return;
  }

  if (!('PushManager' in window)) {
    // Push isn't supported on this browser, disable or hide UI.
    return;
  }
  /**** END feature-detect ****/

  // Push is supported.
  setUpPush();
};


  setTimeout(function(){
    if(!getCookie('_xidx')){
      $('#enable-push-checkbox').trigger('click')      
    }
  },600)
})
