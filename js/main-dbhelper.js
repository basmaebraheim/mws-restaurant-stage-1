var idb = require('idb');
/**
 * Common database helper functions.
 */
class MainDBHelper {
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
       
    MainDBHelper.showCachedRestaurants(callback).then(() => {
      fetch(MainDBHelper.DATABASE_URL).then(response => response.json())
      .then(restaurants => {
        MainDBHelper.openDatabase().then(function(db) {
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
  
    return MainDBHelper.openDatabase().then(function(db) {
      if (!db ) return;
  
      var index = db.transaction('restaurants')
        .objectStore('restaurants');
      return index.getAll().then((restaurants) => {
        callback(null, restaurants);
        
      });
    });
  };
  
  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    MainDBHelper.fetchRestaurants((error, restaurants) => {
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
    MainDBHelper.fetchRestaurants((error, restaurants) => {
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
    MainDBHelper.fetchRestaurants((error, restaurants) => {
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
    MainDBHelper.fetchRestaurants((error, restaurants) => {
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
    MainDBHelper.fetchRestaurants((error, restaurants) => {
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
    if(restaurant.photograph){
      switch(size) {
        case "xs":
              return (`/img/${restaurant.photograph}_552.webp`);
            break;
        case "sm":
              return (`/img/${restaurant.photograph}_653.webp`);
            break;
        case "md":
              return (`/img/${restaurant.photograph}_752.webp`);
            break;
        case "lg":
              return (`/img/${restaurant.photograph}_800.webp`);
            break;
        default:
              return (`/img/${restaurant.photograph}_552.webp`);
      }
    } else{
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
      url: MainDBHelper.urlForRestaurant(restaurant),
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
      MainDBHelper.openDatabase()
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
  
}
