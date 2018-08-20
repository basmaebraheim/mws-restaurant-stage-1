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

let restaurants,
  neighborhoods,
  cuisines
var map
window.markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
  MainDBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    option.setAttribute("role", "menuitem");
    
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  MainDBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.setAttribute("role","menuitem");
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  const map_container = document.getElementById("map-container");
  const toggle_map = document.createElement('button');
  toggle_map.innerHTML = "Show Map";
  toggle_map.id = "toggle_map";
  toggle_map.setAttribute("aria-label", "shaw map");
  toggle_map.onclick= function() {
    if (document.getElementById('map').style.display === 'none')      
      {        
        document.getElementById('map').style.display = 'block';
        document.getElementById('toggle_map').style.display = 'none';    
      } 
  } 
  map_container.appendChild(toggle_map);
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
self.updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  MainDBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  li.className = 'grid-item';
  const picture = document.createElement('picture');
  li.append(picture);

  const source1 = document.createElement('source');
  source1.media = "(max-width: 350px)";
  source1.srcset = MainDBHelper.imageUrlForRestaurant(restaurant , 'sm');
  picture.append(source1);

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.alt ="An image of"+ restaurant.name +" Restaurant in " + restaurant.neighborhood ;
  const config = {
    threshold: 0.1
  };
  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(onChange , config);
    observer.observe(image);
  } else {
    console.log('IntersectionObserver is not supported');
    loadImage(image);
  }
  const loadImage = image => {
    image.src = MainDBHelper.imageUrlForRestaurant(restaurant , 'md');

  }
  function onChange (changes , observer) {
      changes.forEach(change => {
        if (change.intersectionRatio > 0) {
          loadImage(change.target);
          observer.unobserve(change.target);
        }
      })
  }
  picture.append(image);

  const favorite = document.createElement('button');
  favorite.innerHTML = '❤';

  favorite.onclick = function() {
    const isFavNow = !restaurant.is_favorite;
    MainDBHelper.updateFavoriteStatus(restaurant.id, isFavNow);
    restaurant.is_favorite = !restaurant.is_favorite;
    setFavElementClass(favorite , restaurant.is_favorite);
  };
  setFavElementClass(favorite , restaurant.is_favorite);

  li.append(favorite);

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';    
  more.setAttribute("role", "button");  
  more.setAttribute("aria-label", "More Information About"+restaurant.name);
  more.href = MainDBHelper.urlForRestaurant(restaurant);
  li.append(more)
  li.setAttribute("role" , "article");
  return li
}

/**
 *  change favorite element class after click.
 */
const setFavElementClass = (elem , fav) => {
  if (!fav) {
    elem.classList.remove('favorite');
    elem.classList.add('not-favorite');
    elem.setAttribute('aria-label' , 'mark as favorite');


  }else {

    elem.classList.remove('not-favorite');
    elem.classList.add('favorite');
    elem.setAttribute('aria-label' , 'remove from favorites');
  }

}
/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = MainDBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}

const swap_map = () => {    
  if (document.getElementById('map').style.display === 'none')      
  {        
    document.getElementById('map').style.display = 'block';
    document.getElementById('static_map').style.display = 'none';    
  }    
}
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