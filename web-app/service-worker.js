// self.addEventListener('push', function(event) {
//   console.log('Push Event Received.');
//   event.waitUntil(Promise.resolve());
// });
self.addEventListener('push', event => {
  console.log('Push Event Received.',event.data.text());
    var payload = event.data ? event.data.text() : 'no title|no payload';
  event.waitUntil(
      self.registration.showNotification(payload.split('|')[0], {
      body: payload.split('|')[1],
    })
  );
});

/**** START notificationClickEvent ****/
self.addEventListener('notificationclick', function(event) {
  if (event.action) {
    console.log('Action Button Click.', event.action);
  } else {
    console.log('Notification Click.');
  }
});
/**** END notificationClickEvent ****/

// This is here just to highlight the simple version of notification click.
// Normally you would only have one notification click listener.
/**** START simpleNotification ****/
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Do something as the result of the notification click
});
/**** END simpleNotification ****/

/**** START notificationCloseEvent ****/
self.addEventListener('notificationclick', function(event) {
  // TODO: Make analytics API call.
});
/**** END notificationCloseEvent ****/