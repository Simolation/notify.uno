// service worker that will receive the background notifications

self.addEventListener("push", event => {

  // executed when receiving a message
  const data = event.data.json()

  // create and show notification
  event.waitUntil(
    self.registration.showNotification('notify.uno', {
      body: data.message,
      icon: '/logo.png'
    })
  )
})

self.addEventListener('notificationclick', function(event) {

  // notification has been clicked
  // we will just dismiss it
  event.notification.close()
})