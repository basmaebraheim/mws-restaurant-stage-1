var idb = require('idb');


/**
 * Common database helper functions.
 */
class RestaurantDBHelper {
  
  static openDatabase() {
    // If the browser doesn't support service worker,
    // we don't care about having a database
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }
  
    return idb.open('restaurant', 2, function(upgradeDb) {
      switch (upgradeDb.oldVersion) {
          case 0:
            const restaurantsStore = upgradeDb.createObjectStore('restaurants', {
              keyPath: 'id'
            });
            restaurantsStore.createIndex('by-date', 'time');
          case 1:
            var reviewsStore = upgradeDb.createObjectStore('reviews', {
              keyPath: 'id'
            });
            reviewsStore.createIndex('resaurant', 'restaurant_id');

      }
      
    });
  }

  /**
   * Fetch cached restaurant.
   */
  static showCachedRestaurant(id) {
  
    return RestaurantDBHelper.openDatabase().then(function(db) {
      if (!db ) return;
  
      var index = db.transaction('restaurants')
        .objectStore('restaurants');
      return index.getAll().then((restaurants) => {
        // Filter restaurants to have only given id
        const restaurant = restaurants.filter(r => r.id == id);
        return restaurant[0];
        
      });
    });
  };
  /**
   * Fetch cached restaurant reviews by id.
   */
  static showCachedReviews(id) {
  
    return RestaurantDBHelper.openDatabase().then(function(db) {
      if (!db ) return;
  
      var index = db.transaction('reviews')
        .objectStore('reviews');
      return index.getAll().then((allReviews) => {
        // Filter reviews to have only given id
        const reviews = allReviews.filter(r => r.restaurant_id == id);
        return reviews;
        
      });
    });
  };

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Fetch a restaurant by its ID.
   */
  
  static fetchRestaurantById(id, callback) {
    // Fetch a restaurant by its ID.
    fetch(RestaurantDBHelper.DATABASE_URL + '/' + id).then(response => response.json())
    .then(restaurant => {
      RestaurantDBHelper.openDatabase().then(function(db) {
        if (!db) return;
    
        var tx = db.transaction('restaurants', 'readwrite');
        var store = tx.objectStore('restaurants');
        store.put(restaurant);
      });

      if (restaurant) {
        return callback(null, restaurant);
      } 
    })
    .catch(e => {
      RestaurantDBHelper.showCachedRestaurant(id).then(cachedRestaurant => {
        return callback(null, cachedRestaurant);
      });
    });

  }

  /**
   * Fetch restaurant reviews.
   */
  
  static fetchRestaurantReviews(id) {
       
    return fetch(`http://localhost:1337/reviews/?restaurant_id=${id}`)
      .then(response => response.json())
      .then(reviews => {
        RestaurantDBHelper.openDatabase()
          .then(db => {
            if (!db) return;

            let tx = db.transaction('reviews' , 'readwrite');
            const store = tx.objectStore('reviews');
            if (Array.isArray(reviews)) {
              reviews.forEach(function(review) {
                store.put(review);
              });
            } else {
              store.put(reviews);
            }
          });
          
          return Promise.resolve(reviews);
      })
      .catch(error => {
        return RestaurantDBHelper.showCachedReviews(id)
          .then((storedReviews) => {
            return Promise.resolve(storedReviews);
          });
      });
      
  
  } 
  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant , size) {
  
    if(restaurant.photograph){
      return (`/img/${restaurant.photograph}.webp`);
    }else{
      return (`#`);
    }
  }
  

  /**
   * Restaurant name.
   */
  static nameForRestaurant(restaurant) {
    return (`${restaurant.name}`);
  }
  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: RestaurantDBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

  /**
   * Add Review To Db
   */
  static addReview(newReview ) {
    const offline_obj = {
      name: 'addReview',
      data: newReview,
      object_type: 'review'
    };
    if (!navigator.onLine && (offline_obj.name === 'addReview')) {
      RestaurantDBHelper.sendDataWhenOnline(offline_obj);
      return;
    }
    let reviewSend = {
      "name": newReview.name,
      "rating": parseInt(newReview.rating),
      "comments":newReview.comments,
      "restaurant_id": newReview.id
    };
    var fetch_options = {
      method: 'POST',
      body: JSON.stringify(reviewSend),
      headers: new Headers({
        'Content-Type': 'application/json' 
      })
    };
    fetch('http://localhost:1337/reviews', fetch_options).then((response) => {
      const contentType = response.headers.get('content-type');
      if(contentType && contentType.indexOf('application/json') !== -1) {
        return response.json();
      } else { return 'API call successfull'}
    })
    .then((data) => { console.log('fetch successfull') })
    .catch((error) => console.log(error));
    
  }
  static sendDataWhenOnline(offline_obj) {
    localStorage.setItem('data', JSON.stringify(offline_obj.data));
    window.addEventListener('online', (event) => {
      let data = JSON.parse(localStorage.getItem('data'));
      [...document.querySelectorAll(".reviews_offline")]
      .forEach(el => {
        el.classList.remove("reviews_offline");
        el.querySelector(".offline_label").remove();
      });
      if (data !== null) {
        if (offline_obj.name === 'addReview') {
          RestaurantDBHelper.addReview(offline_obj.data);
        }
        localStorage.removeItem('data');
      }
    });
  }
}
