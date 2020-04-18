// init socket.io
var socket = io()

// vue app
var app = new Vue({
  el: "#app",
  data: {
    user: false,
    tokens: [],
    notifications: [],
    subscriptions: [],
    registration: false,
    subscription: null,
    notificationStatus: Notification.permission,

    // ui things
    subscriptionToggleDisabled: true,
    notificationsSidebar: true
  },
  computed: {
    // get the setup code for windows devices
    getWindowsCode: function () {
      if (this.tokens.length > 0) {
        return 'mkdir %APPDATA%\\notify.uno & echo @echo off ^& curl https://notify.uno/' + this.tokens[0]._id + ' -d %* > %APPDATA%\\notify.uno\\notify.bat & echo Add %APPDATA%\\notify.uno\\ to your system environment variables'
      } else {
        return '-'
      }
    },

    // get the setup code for linux and mac devices
    getUnixCode: function () {
      if (this.tokens.length > 0) {
        return 'echo \'notify() { curl https://notify.uno/' + this.tokens[0]._id + ' -d "$*"; }\' >> ~/.bashrc && source ~/.bashrc'
      } else {
        return '-'
      }
    },

    showNotificationWindow: function () {
      return this.broserSupportsNotifications && (this.notificationStatus === "default")
    },

    broserSupportsNotifications: function () {
      return ("Notification" in window)
    },

    browserSupportsBackgroundNotifications: function () {
      return ('serviceWorker' in navigator) && ('PushManager' in window)
    },

    hasNotificationSubscription: function () {
      // check if a service worker is set up
      // first check if background notifications are supported by the browser 
      if (!this.browserSupportsBackgroundNotifications) return false

      // check for an active subscription
      if (!this.subscription) return false

      // check if active subscription is one of the server validated subscriptions
      var validSubscription = false
      for (var i = 0; i < this.subscriptions.length; i++) {
        if (this.subscriptions[i].body.endpoint === this.subscription.endpoint) {
          validSubscription = true
          break
        }
      }

      if (!validSubscription) {

        // the active subscription is not validated on the server (probably deleted) so unsubscribe
        this.unsubscribeNotifications()
      }
      
      return validSubscription
    }
  },
  methods: {
    requestNotificationPremission: async function () {

      // request notification permission
      const notificationPermission = await Notification.requestPermission()

      // set current notification permission status
      this.notificationStatus = notificationPermission
    },

    toggleSubscription: async function () {
      this.subscriptionToggleDisabled = true
      if (!this.subscription) {

        // create subscription if there is no active subscription
        await this.subscribeToNotifications()
      } else {

        // unsubscribe and remove subscription
        await this.unsubscribeNotifications()
      }
      this.subscriptionToggleDisabled = false
    },

    subscribeToNotifications: async function () {
      
      // subscribe and send to server
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          // Public VAPID Key (has to be same one as on the backend environment variables)
          'BL5-oN3LzQ1IvrO6e0VqcIOWaYuZ80jR0AWrkBQgfbvcQI0LPAavNdGsY01IgAZrplYOj0jQtLQ666B_uY6guRM'
        )
      })

      const subscriptionName = this.getBrowserName() + ' on ' + this.getOSName()

      // send subscription details to backend
      const response = await axios.post('/api/subscription', {
        name: subscriptionName,
        body: JSON.stringify(subscription)
      })

      // first add the server subscription to the list
      this.subscriptions.push(response.data.data)

      // then set the local subscription
      this.subscription = subscription
    },

    unsubscribeNotifications: async function () {

      const endpoint = this.subscription.endpoint

      // unsubscribe
      await this.subscription.unsubscribe()

      // remove subscription from the server
      await axios.delete('/api/subscription', {
        data: {
          endpoint
        }
      })

      // remove subscription from the local list
      this.subscriptions = this.subscriptions.filter (sub => sub.body.endpoint !== endpoint)

      // remove local saved subscription element
      this.subscription = null
    },

    showNotification: function (notification) {

      // check if notifications are possible and if no background worker is active (else you would receive multiple notification)
      if (this.broserSupportsNotifications && this.notificationStatus === 'granted' && !this.hasNotificationSubscription) {
        // show notification
        new Notification('notify.uno', {
          body: notification.message,
          icon: '/logo.png'
        })
      }
    },

    getOSName: function () {

      // get roughly the operating system name
      var name = 'Unknown OS'
      if (navigator.appVersion.indexOf("Win") != -1) name = 'Windows'
      if (navigator.appVersion.indexOf("Mac") != -1) name = 'MacOS'
      if (navigator.appVersion.indexOf("Mac") != -1 && navigator.appVersion.indexOf("Mobile") != -1) name = 'iOS'
      if (navigator.appVersion.indexOf("X11") != -1) name = 'Unix'
      if (navigator.appVersion.indexOf("Linux") != -1) name = 'Linux'
      if (navigator.appVersion.indexOf("Linux") != -1 && navigator.appVersion.indexOf("Mobile") != -1) name = 'Android'

      return name
    },

    getBrowserName: function () {

      // get roughly the browser name
      var test = function(regexp) {
        return regexp.test(window.navigator.userAgent);
      }
      switch (true) {
        case test(/edg/i): return "Edge";
        case test(/opr/i) && (!!window.opr || !!window.opera): return "Opera";
        case test(/chrome/i) && !!window.chrome: return "Chrome";
        case test(/trident/i): return "IE";
        case test(/firefox/i): return "Firefox";
        case test(/safari/i): return "Safari";
        default: return "Unknown Browser";
      }
    },

    urlBase64ToUint8Array: function (e) {

      // convert the push notification key to array
      const r=(e+"=".repeat((4-e.length%4)%4)).replace(/\-/g,"+").replace(/_/g,"/"),t=window.atob(r),n=new Uint8Array(t.length);for(let e=0;e<t.length;++e)n[e]=t.charCodeAt(e);
      return n
    }
  },
  created: async function() {
    // load user details
    const response = await axios.get('/api/main')
    
    this.user = response.data.data.user
    this.tokens = response.data.data.tokens
    this.notifications = response.data.data.notifications
    this.subscriptions = response.data.data.subscriptions

    // set up the socket connection for incoming notifications
    socket.on("notification", notification => {
      this.notifications.unshift(notification)

      // show notification (only when page is open and no subscription is available)
      this.showNotification(notification)
    })

    // register the service worker when supported
    if (this.browserSupportsBackgroundNotifications) {
      this.registration = await navigator.serviceWorker.register("sw.js")

      // load current subscription
      this.subscription = await this.registration.pushManager.getSubscription()
      this.subscriptionToggleDisabled = false
    }
  }
})

// vue component for the code examples
Vue.component('code-snippet', {
  props: ['code'],
  template: `<div class="rounded-md bg-gray-50 px-6 py-5 flex items-center justify-between">
  <pre class="text-sm leading-5 font-medium text-gray-900 overflow-x-auto"><code>{{ code }}</code></pre>
  <div class="mt-4 sm:mt-0 sm:ml-6 sm:flex-shrink-0">
    <span class="inline-flex rounded-md shadow-sm">
      <copy-button :text="code"></copy-button>
    </span>
  </div>
</div>`
})

// vue component for the copy button
Vue.component('copy-button', {
  props: ['text'],
  data: function () {
    return {
      copied: false
    }
  },
  methods: {
    copyText: function(text) {
      // show visually that text has been copied
      this.copied = true

      // copy the text
      const el = document.createElement('textarea')
      el.value = text
      el.setAttribute('readonly', '')
      el.style.position = 'absolute'
      el.style.left = '-9999px'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)

      // make the button normal again
      setTimeout(() => this.copied = false, 500)
    }
  },
  template: `<button
    type="button"
    class="inline-flex items-center px-4 py-2 text-sm leading-5 font-medium rounded-md focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:bg-gray-50 transition ease-in-out duration-150"
    :class="{ 'bg-green-500 text-white hover:text-white': copied, 'text-gray-700 bg-white hover:text-gray-500': !copied }"
    @click="copyText(text)">
      Copy
  </button>`
})