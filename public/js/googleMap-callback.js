function initAutocomplete() {
  //init with Grenoble
  var initialLocation = new google.maps.LatLng(45.188529, 5.724523999999974);
  if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(function (position) {
           initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
           console.log(initialLocation.lat(), initialLocation.lng());
           map.setCenter(initialLocation);
       });
   }

  var map = new google.maps.Map(document.getElementById('map'), {
    // TODO: Add user current location here
    center: initialLocation,
    zoom: 13,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  // Create the search box and link it to the UI element.
  var input = document.getElementById('place');
  var searchBox = new google.maps.places.SearchBox(input);

  // Bias the SearchBox results towards current map's viewport.
  map.addListener('bounds_changed', function() {
    searchBox.setBounds(map.getBounds());
  });
  var manuallySelect = false;
  var markers = [];
  // [START region_getplaces]
  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBox.addListener('places_changed', function() {
    var places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }

    // Clear out the old markers.
    markers.forEach(function(marker) {
      marker.setMap(null);
    });
    markers = [];

    // Clear evenutal manually selected marker
    manuallySelect = false;
    $('.centerMarker').remove();
    //$('.centerMarker').remove();

    // For each place, get the icon, name and location.
    var bounds = new google.maps.LatLngBounds();
    places.forEach(function(place) {
      var icon = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25)
      };

      // Create a marker for each place.
      markers.push(new google.maps.Marker({
        map: map,
        icon: icon,
        title: place.name,
        position: place.geometry.location
      }));

      if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });
    map.fitBounds(bounds);
  });
  // [END region_getplaces]

  // add listener event for button
  var btn = document.querySelector('#btn');
  btn.addEventListener('click', function () {
    manuallySelect = true;
    $('#place').val('');
    // Clear out the old markers.
    markers.forEach(function(marker) {
      marker.setMap(null);
    });
    markers = [];
    $('<div/>').addClass('centerMarker').appendTo(map.getDiv())
           //do something onclick
          .click(function(){
             var that=$(this);
             if(!that.data('win')){
              that.data('win',new google.maps.InfoWindow({content:'meeting point!'}));
              that.data('win').bindTo('position',map,'center');
             }
             that.data('win').open(map);
    });
  });

  /*var btnSubmit = document.querySelector('#btn-submit');
  btnSubmit.addEventListener('click', function () {
    if(manuallySelect){
        console.log(map.getCenter().lat(), map.getCenter().lng());
    } else {
      markers.forEach(function(marker) {
        console.log(marker.position.lat(), marker.position.lng());
      });
    }
  });*/
}
