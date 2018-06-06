/**
 * start sevice worker Registration.
 */
const startServiceWorker = () =>{ 
    if (!navigator.serviceWorker) return;
  
    navigator.serviceWorker.register('/sw.js').then(function() {
      console.log('Registration worked!');
    }).catch(function() {
      console.log('Registration failed!');
    });

};
startServiceWorker();