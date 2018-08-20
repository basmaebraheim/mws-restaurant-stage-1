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
  favorite.classList.add = 'fav-btn';

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

    elem.classList.add ='not-favorite';

    elem.setAttribute('aria-label' , 'mark as favorite');


  }else {

    elem.classList.remove('not-favorite');
    elem.classList.add = 'favorite';
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