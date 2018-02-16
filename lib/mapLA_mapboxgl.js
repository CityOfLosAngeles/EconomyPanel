// some inspiration drawn from https://bl.ocks.org/john-guerra/43c7656821069d00dcbc
// and https://bl.ocks.org/mbostock/4060606

// also of some interest: square mileage of each CD.
// some variables (e.g. population) should be mapped per square mile 
// http://documents.lahsa.org/planning/homelesscount/2009/CityofLA-CouncilDistricts.pdf

// d3 with mapbox gl
// http://bl.ocks.org/enjalot/0d87f32a1ccb9a720d29ba74142ba365
// https://bl.ocks.org/shimizu/5f4cee0fddc7a64b55a9

// add path directly to map:
// https://stackoverflow.com/questions/37928238/making-a-path-with-coordinates-using-d3-and-mapbox

// Constants for sizing
  var w = window,
      d = document,
      e = d.documentElement,
      g = d.getElementsByTagName('body')[0],
      x = w.innerWidth || e.clientWidth || g.clientWidth,
      y = w.innerHeight|| e.clientHeight|| g.clientHeight;

// set some variables
var map_svg_width=x,
	map_svg_height=y;

d3.select('#map').attr('style', 'height: ' + y + 'px; width: ' + x + 'px; margin:0; padding:0');

mapboxgl.accessToken = 'pk.eyJ1IjoiYWVzY2hlcmxpbmciLCJhIjoiY2o4cTRsdXdhMGVvbzJ4b3gwb3lmMDR6bCJ9.BpnZvVcHTuDFiTo9ngzQiw';

var map = new mapboxgl.Map({
container: 'map',
style: 'mapbox://styles/mapbox/light-v9',
center: [-118.35, 34.02],
zoom: 8.6
})


map.on('load', function() {

  map.resize();

  d3.json('geodata/council_districts.geojson', function(err, geodata) {
    // adding objects directly to map, not using d3

    map.addSource('council_districts', {
      'type': 'geojson',
      'data': geodata
    });

    map.addLayer({
      'id': 'council_districts',
      'type': 'fill',
      'source': 'council_districts',
      'paint': {
        'fill-color': 'steelblue',
        'fill-opacity': 0.5
      }
    });

    // https://www.mapbox.com/mapbox-gl-js/example/polygon-popup-on-click/
    // When a click event occurs on a feature in the states layer, open a popup at the
    // location of the click, with description HTML from its properties.
    map.on('click', 'council_districts', function (e) {
        myCD = e.features[0].properties.Council_District;
        myCM = e.features[0].properties.Councilmember;
        myHtml = "<div style='margin:5px'><span style='font-weight:bold'>" + myCD + "</span><br><span>" + myCM + "</span></div>";
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(myHtml)
            .addTo(map);
    });

    // Change the cursor to a pointer when the mouse is over the states layer.
    map.on('mouseenter', 'council_districts', function () {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Change it back to a pointer when it leaves.
    map.on('mouseleave', 'council_districts', function () {
        map.getCanvas().style.cursor = '';
    });

    // to remove a layer:
    // map.removeLayer('council_districts');

  })

})


