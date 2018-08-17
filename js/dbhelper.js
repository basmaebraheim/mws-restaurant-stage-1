var idb = require('idb');
/**
 * Common database helper functions.
 */
class DBHelper {
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
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Fetch all restaurants.
   */
  
  static fetchRestaurants(callback) {
       
    DBHelper.showCachedRestaurants(callback).then(() => {
      fetch(DBHelper.DATABASE_URL).then(response => response.json())
      .then(restaurants => {
        DBHelper.openDatabase().then(function(db) {
          if (!db) return;
      
          var tx = db.transaction('restaurants', 'readwrite');
          var store = tx.objectStore('restaurants');
          restaurants.forEach(function(restaurant) {
            store.put(restaurant);
          });
        });
        return callback(null, restaurants);
      })
      .catch(e => callback(e, null));
    });
  
  } 
   /**
   * Fetch all cached restaurants.
   */
  static showCachedRestaurants(callback) {
  
    return DBHelper.openDatabase().then(function(db) {
      if (!db ) return;
  
      var index = db.transaction('restaurants')
        .objectStore('restaurants');
      return index.getAll().then((restaurants) => {
        callback(null, restaurants);
        
      });
    });
  };
  /**
   * Fetch a restaurant by its ID.
   */
  
  static fetchRestaurantById(id, callback) {
    // Fetch a restaurant by its ID.
    DBHelper.showCachedRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given id
        const restaurant = restaurants.filter(r => r.id == id);
        callback(null, restaurant[0]);
      }
    }).then(() => {
      fetch(DBHelper.DATABASE_URL + '/' + id).then(response => response.json())
      .then(restaurant => callback(null, restaurant))
      .catch(e => callback(e, null));
    });
  }

  /**
   * Fetch restaurant reviews.
   */
  
  static fetchRestaurantReviews(id) {
       
    return fetch(`http://localhost:1337/reviews/?restaurant_id=${id}`)
      .then(response => response.json())
      .then(reviews => {
        DBHelper.openDatabase()
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
          console.log(reviews);
      })
      .catch(error => {
        return DBHelper.getStoredReviewsById('reviews' , 'restaurant' , id)
          ,then((storedReviews) => {
            return Promise.resolve(storedReviews);
          });
      });
      
  
  } 
  /**
   * Fetch reviews from IDB;
   */
  static getStoredReviewsById(table , idx , id){
    return this.openDatabase()
      .then(function(db) {
        if (!db) return;

        const store = db.transaction(table).objectStore(table);
        const indexId = store.index(idx);
        return indexId.getAll(id);
      });
  }
  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
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
    console.log("get image");
    /*if(restaurant.photograph){
      switch(size) {
        case "xs":
              return (`/images/${restaurant.photograph}-200_xs.jpg`);
            break;
        case "sm":
              return (`/images/${restaurant.photograph}-400_sm.jpg`);
            break;
        case "md":
              return (`/images/${restaurant.photograph}-600_md.jpg`);
            break;
        case "lg":
              return (`/images/${restaurant.photograph}-800_lg.jpg`);
            break;
        default:
              return (`/images/${restaurant.photograph}-800_lg.jpg`);
      }
    } else{
        return (`#`);
    }
    */
  
    if(restaurant.photograph){
      console.log("get image");
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
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

  static updateFavoriteStatus(restaurantId, isFavorite) {
    fetch(`http://localhost:1337/restaurants/${restaurantId}/?is_favorite=${isFavorite}` ,{
      method: 'PUT'
    })
    .then(() => {
      console.log('changed');
      DBHelper.openDatabase()
        .then(db => {
          const tx = db.transaction('restaurants' , 'readwrite');
          const restauransStore = tx.objectStore('restaurants');
          restauransStore.get(restaurantId)
            .then(restaurant => {
              restaurant.is_favorite = isFavorite;
              restauransStore.put(restaurant);
            });
        });
    })
  }
  /**
   * Add Review To Db
   */
  static addReview(newReview ) {
    console.log(restaurant);
    const offline_obj = {
      name: 'addReview',
      data: newReview,
      object_type: 'review'
    };
    if (!navigator.onLine && (offline_obj.name === 'addReview')) {
      DBHelper.sendDataWhenOnline(offline_obj);
      return;
    }
    let reviewSend = {
      "name": newReview.name,
      "rating": parseInt(newReview.rating),
      "comments":newReview.comments,
      "restaurant_id": newReview.id
    };
    console.log(reviewSend);
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
        console.log(data);
        if (offline_obj.name === 'addReview') {
          DBHelper.addReview(offline_obj.data);
        }
        localStorage.removeItem('data');
      }
    });
  }
}

