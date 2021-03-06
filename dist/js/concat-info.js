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
    console.log("send review");
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
    console.log("cached review");
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

let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  const map_container = document.getElementById("map-container");
  const toggle_map = document.createElement('button');
  toggle_map.innerHTML = "Show Map";
  toggle_map.id = "toggle_map";
  toggle_map.onclick= function() {
    if (document.getElementById('map').style.display === 'none')      
      {        
        document.getElementById('map').style.display = 'block';
        document.getElementById('toggle_map').style.display = 'none';    
      } 
  } 
  map_container.appendChild(toggle_map);

  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.log(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      RestaurantDBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    const error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    RestaurantDBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        //console.log(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.alt= "an image of "+ RestaurantDBHelper.nameForRestaurant(restaurant) + " restaurant in " + restaurant.neighborhood;
  image.src = RestaurantDBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML(restaurant.id);
  // add reviews form
  addReviewFormHtml();

}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (id) => {
  RestaurantDBHelper.fetchRestaurantReviews(id)
      .then(rev => {
        const reviews = rev;
        const container = document.getElementById('reviews-container');
        const title = document.createElement('h2');
        title.innerHTML = 'Reviews';
        container.appendChild(title);

        if (!reviews) {
          const noReviews = document.createElement('p');
          noReviews.innerHTML = 'No reviews yet!';
          container.appendChild(noReviews);
          return;
        }
        const ul = document.getElementById('reviews-list');
        reviews.forEach(review => {
          ul.appendChild(createReviewHTML(review));
        });
        container.appendChild(ul);
      });
  
}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');  
  li.role="tree-item";
  const reviewHead = document.createElement('div');
  li.appendChild(reviewHead);

  if (!navigator.onLine) {
    console.log("add offline review");
    const connection_status = document.createElement('p');
    connection_status.classList.add('offline_label');
    connection_status.innerHTML = "This review will be submitted when get online.";
    li.classList.add("reviews_offline");
    li.appendChild(connection_status);

  }

  const name = document.createElement('h3');
  name.innerHTML = review.name;
  name.className = 'name';
  name.setAttribute("tabindex","0");  
  reviewHead.appendChild(name);

  /*const date = document.createElement('p');
  date.innerHTML = review.date;
  date.className = 'date';
  date.setAttribute("tabindex","0");
  reviewHead.appendChild(date);*/
  
  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.className = 'rating';
  rating.setAttribute("tabindex","0");
  li.appendChild(rating);
  
  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);
  comments.setAttribute("tabindex","0");
  li.setAttribute("role","article");
  
  return li;
}

const addReviewFormHtml = () => {
  const formContainer  = document.getElementById("form-container");
  const form = document.createElement('form');
  form.id = 'review-form';
  const header = document.createElement('h2');
  header.innerHTML = 'Add Review';
  form.append(header);
  const newLine = document.createElement('br');
  form.append(newLine);


  const reviewer_label = document.createElement('label');
	reviewer_label.htmlFor = 'author_name';
	reviewer_label.innerHTML = 'Your name:';
  form.append(reviewer_label);


	const author_name = document.createElement('input');
	author_name.type = 'text';
	author_name.name = 'name';
	author_name.id = 'review-author';
  form.append(author_name);
  const newLine1 = document.createElement('br');
  form.append(newLine1);

	const rating_label = document.createElement('label');
	rating_label.htmlFor = 'rating';
	rating_label.innerHTML = 'Rating:';
  form.append(rating_label);


	const rating = document.createElement('select');
	rating.name = 'rating';
	rating.id = 'review-rating';
	for (let index = 1; index < 6; index++) {

		const option = document.createElement('option');
		option.innerHTML = index;
		option.value = index;
		rating.append(option);
	}
  form.append(rating);
  const newLine2 = document.createElement('br');
  form.append(newLine2);


	const comment_label = document.createElement('label');
	comment_label.htmlFor = 'comments';
	comment_label.innerHTML = 'Comment:';
  form.append(comment_label);


	const comment_text = document.createElement('textarea');
	comment_text.className = 'textarea';
	comment_text.name = 'comments';
	comment_text.id = 'review-comments';
  form.append(comment_text);
  const newLine3 = document.createElement('br');
  form.append(newLine3);

  const id_label = document.createElement('label');
	id_label.htmlFor = 'restaurant_id';
	id_label.innerHTML = 'restaurant id:';
  form.append(id_label);


	const restaurant_id = document.createElement('input');
	restaurant_id.className = 'resId';
	restaurant_id.name = 'restaurant_id';
	restaurant_id.id = 'restaurant_id';
  form.append(restaurant_id);
  const newLine4 = document.createElement('br');
  form.append(newLine4);

	const submitReview = document.createElement('button');
	submitReview.className = 'button';
	submitReview.id = 'submitReview';
	submitReview.innerHTML = 'Submit Review';
	submitReview.onclick = addReview;
  form.append(submitReview);

  formContainer.appendChild(form);

}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute("aria-current","page");
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Add review
 */
const addReview = () => {
  event.preventDefault();
  let name = document.getElementById("review-author").value;
  let rating = document.getElementById('review-rating').value;
  let comments = document.getElementById("review-comments").value;
  let restaurant_id = document.getElementById("restaurant_id").value;
  const review = [name , rating , comments , restaurant_id];

  const newReview = {
    id: restaurant_id,
    rating : rating,
    name : name,
    comments: comments,
    createdAt : new Date()
  };
  RestaurantDBHelper.addReview(newReview);
  const ul = document.getElementById('reviews-list');

  ul.appendChild(createReviewHTML(newReview));

  document.getElementById("review-form").reset();

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