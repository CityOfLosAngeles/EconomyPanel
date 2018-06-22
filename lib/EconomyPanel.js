// some inspiration drawn from https://bl.ocks.org/john-guerra/43c7656821069d00dcbc
// and https://bl.ocks.org/mbostock/4060606

// also of some interest: square mileage of each CD.
// some variables (e.g. population) should be mapped per square mile
// http://documents.lahsa.org/planning/homelesscount/2009/CityofLA-CouncilDistricts.pdf

// INITIAL SETUP //

// set some variables
var map_svg_width=770,
  map_svg_height=450,
  map_zoom = 8.5,
  map_long = -117.95,
  map_lat = 34.02;

// make the SVG canvas
map_svg = d3.select('#map_div')
  .append('svg')
  .attr('width', map_svg_width)
  .attr('height', map_svg_height);

// draw the box around the SVG
// bb = map_svg.append('rect')
//  .attr('x', 0)
//  .attr('y', 0)
//  .attr('width', map_svg_width)
//  .attr('height', map_svg_height)
//  .attr('stroke', 'black')
//  .attr('fill', 'none');

// make a group for holding map elements
var mapLayer = map_svg.append('g')
  .classed('map-layer', true);

// projection for the map
var projection = d3.geoMercator()
  .scale((512) * 0.5 / Math.PI * Math.pow(2, +map_zoom))
  .center([+map_long, +map_lat])
  .translate([map_svg_width / 2, map_svg_height / 2]);

// path function for drawing council districts
var path = d3.geoPath()
  .projection(projection);

// create some global variables for debugging purposes
// var cf;
// var myVar;

// wait until all the data is loaded before proceeding
queue()
  .defer(d3.json, 'geodata/council_districts.geojson')
  .defer(d3.csv, 'data/EconomyPanel.csv')
  .await(map_ready)







// begin map_ready function //
// this is the meat of it! //

function map_ready(error, geodata, econdata) {
  if (error) throw error;

  // geodata //
  var geofeatures = geodata.features;

  // set up crossfilter on the economic data
  var data = crossfilter(econdata);

  var category = data.dimension(function(d) {return d["category"];});
  var indicator = data.dimension(function (d) {return d["indicator"];});
  var gender = data.dimension(function (d) {return d["gender"];});
  var subindicator = data.dimension(function (d) {return d["sub_indicator"];});
  var time = data.dimension(function (d) {return d["calendar_year"];});
  var value = data.dimension(function (d) {return +d["value"];});

  var current_indicator = '';
  var current_subindicator = '';
  var selection_complete = false;
  var has_gender = false;
  var gender_selected = false;
  var subind_selected = false;
  var district_selected = false;

  // cf = data;

  // map title and subtitle variables
  mapTitle = d3.select('#mapTitle');
  mapTitle.text('No variable selected');
  mapSubtitle = d3.select('#mapSubtitle');





  // Keep only the indicators available for Council District 1
  districtsOnly = function() {
    var locality = data.dimension(function(d) {return d.locality});
    // select non-city observations, e.g. county, MSA
    locality.filter(function(d) {return(d!="LOS ANGELES CITY")});
    // remove them!
    data.remove();
    // remove the filter
    locality.filterAll();
    locality.dispose();

    // select indicators available for Council District 1
    var cd = data.dimension(function(d) {return d.council_district});
    cd.filter(function (d) {return d.toLowerCase().indexOf("council district 1") >= 0 || d.toLowerCase().indexOf(1) >= 0});
    // pick out all indicators with more than one observation using the current filters
    CDindicatorCounts = indicator.group().reduceCount().all().filter(function (d) {return d.value > 0});
    CDindicators = CDindicatorCounts.map(function (d) {return d.key});

    // remove cd filter
    cd.filterAll();
    cd.dispose();

    // select indicators not in the list
    indicator.filter(function (d) {return CDindicators.indexOf(d)==-1});
    // remove them!
    data.remove();
    // undo the filter
    indicator.filterAll();
  }
  districtsOnly();


  mouseclick = function() {

    // check whether the object is a path in the map, or a row in the table
    // either way, save the selections for both
    if (d3.select(this)._groups[0][0].tagName=="path") {
      id_tmp = "CD" + d3.select(this).attr('id').match(/\d+/g);
      district_row = d3.select('#' + id_tmp);
      district_map = d3.select(this);
    } else if (d3.select(this).attr('id')!="City") {
      id_tmp = d3.select(this).attr('longID').replace(/\s/g, '');
      district_row = d3.select(this);
      district_map = d3.select('#' + id_tmp);
    } else {
      district_row = d3.select(this);
      district_map = null;
    }

    // determine the prior state of the district (selected or not)
    isSelected = district_row.classed('selected');

    // unselect all districts (paths and tableRows)
    d3.selectAll('.district').classed('selected', false);
    d3.selectAll('.tableRow').classed('selected', false);

    // unhighlight everything in the table (and map if the selection is complete)
    if (selection_complete) d3.selectAll('.district').classed('highlighted', false);
    d3.select('#table').selectAll('text').attr('style', 'font-weight:normal');
    d3.select('#table').selectAll('text').filter('.title').attr('style', 'font-weight:bold; font-size:14px');
    d3.select('#City').selectAll('text').attr('style', 'font-weight:normal; font-size:14px; font-style:italic');
    d3.select('#table').selectAll('.background').attr('style', 'stroke:none; fill:none');

    // if it was selected, set district_selected = false
    if (isSelected) {
      district_selected = false;
    } else if (selection_complete) {
      // if it wasn't selected, select it, set district_selected = true, update display text, hightlight table

      if (district_map) district_map.moveToFront().classed('selected', true);
      district_row.classed('selected', true);
      district_selected = true;

      // update the display text
      if (district_map) {
        district_text = district_map.attr('label');
        councilmember_text = district_map.attr('councilmember');
        cd_label.text(district_text);
        cd_councilmember.text(councilmember_text);
        cd_value.text('(Click to select/unselect)');
      } else {
      	district_text = "City of Los Angeles";
      	cd_label.text(district_text);
      	cd_councilmember.text('(Click to select/unselect)');
      	cd_value.text('');
        // cd_label.on('click', function() {
        //   document.getElementById('City').dispatchEvent(new MouseEvent('click'));
        // })
      }

      // highlight the district in the table
      var locations = [{"long":"City of Los Angeles", "short":"City"},{"long": "Council District 1", "short":"CD1"},{"long": "Council District 2", "short":"CD2"},{"long": "Council District 3", "short":"CD3"},{"long": "Council District 4", "short":"CD4"},{"long": "Council District 5", "short":"CD5"},{"long": "Council District 6", "short":"CD6"},{"long": "Council District 7", "short":"CD7"},{"long": "Council District 8", "short":"CD8"},{"long": "Council District 9", "short":"CD9"},{"long": "Council District 10", "short":"CD10"},{"long": "Council District 11", "short":"CD11"},{"long": "Council District 12", "short":"CD12"},{"long": "Council District 13", "short":"CD13"},{"long": "Council District 14", "short":"CD14"},{"long": "Council District 15", "short":"CD15"}];
      var locations_long = locations.map(function (d) {return d.long});
      var locations_short = locations.map(function (d) {return d.short});
      var index_tmp = locations_long.indexOf(district_text);
      var id_tmp = '#' + locations_short[index_tmp];
      d3.select(id_tmp).selectAll('text').attr('style', 'font-weight:bold');
      d3.select(id_tmp).select('.background').attr('style', 'stroke:gray; fill:none');

    }
    // update the time toggle
    updateTimescale();
  }


  // boolean for controlling mouseover. otherwise it gets buggy in Internet Explorer.
  var mouseoverStatus = false;

  mouseover = function() {

  	// activate mouseover if:
  	// (1) mouseoverStatus==false AND
  	// (2) district_selected==false AND
  	// (3) (the object is a path OR (the object is a tableRow AND selection is complete))

  	// the following is equivalent to (3): !(!isPath & !selection_complete)
  	var isPath = d3.select(this)._groups[0][0].tagName=="path"

    if (!mouseoverStatus & !district_selected & !(!isPath & !selection_complete)) {

      // unhighlight all districts
      d3.selectAll('.district').classed('highlighted', false);

      // check whether the object is a path in the map, or a row in the table
      // either way, save the selections for both
      if (d3.select(this)._groups[0][0].tagName=="path") {
        id_tmp = "#CD" + d3.select(this).attr('id').match(/\d/)
        district_row = d3.select(id_tmp);
        district_map = d3.select(this);
      } else if (d3.select(this).attr('id')!="City") {
        id_tmp = d3.select(this).attr('longID').replace(/\s/g, '');
        district_row = d3.select(this);
        district_map = d3.select('#' + id_tmp);
      } else {
        district_row = d3.select(this);
        district_map = null;
      }

      // highlight and update the display text
      if (district_map) {
        district_map.moveToFront().classed('highlighted', true);
        district_text = district_map.attr('label');
        councilmember_text = district_map.attr('councilmember');
        cd_label.text(district_text);
        cd_councilmember.text(councilmember_text);
      } else {
        district_text = "City of Los Angeles";
        cd_label.text(district_text);
        cd_councilmember.text('(Click to select/unselect)');
        cd_value.text('');
      }

      // if variable selection is complete, change the cursor and highlight the district in the table
      if (selection_complete) {
        // change the cursor
	    district_row.style('cursor', 'pointer');
	    if (district_map) district_map.style('cursor', 'pointer');
        if (district_map) cd_value.text('(Click to select/unselect)');
        var locations = [{"long":"City of Los Angeles", "short":"City"},{"long": "Council District 1", "short":"CD1"},{"long": "Council District 2", "short":"CD2"},{"long": "Council District 3", "short":"CD3"},{"long": "Council District 4", "short":"CD4"},{"long": "Council District 5", "short":"CD5"},{"long": "Council District 6", "short":"CD6"},{"long": "Council District 7", "short":"CD7"},{"long": "Council District 8", "short":"CD8"},{"long": "Council District 9", "short":"CD9"},{"long":   "Council District 10", "short":"CD10"},{"long": "Council District 11", "short":"CD11"},{"long": "Council District 12", "short":"CD12"},{"long": "Council District 13", "short":"CD13"},{"long": "Council District 14", "short":"CD14"},{"long": "Council District 15", "short":"CD15"}];
        var locations_long = locations.map(function (d) {return d.long});
        var locations_short = locations.map(function (d) {return d.short});
        var index_tmp = locations_long.indexOf(district_text);
        var id_tmp = '#' + locations_short[index_tmp];
        d3.select(id_tmp).selectAll('text').attr('style', 'font-weight:bold');
        d3.select(id_tmp).select('.background').attr('style', 'stroke:gray; fill:none');
      }

      mouseoverStatus = true;
    } // end of if(!mouseoverStats & !district_selected)
  }

  mouseout = function() {
    if (!district_selected) {
      mouseoverStatus = false;

      // check whether the object is a path in the map, or a row in the table
      // either way, save the selections for both
      if (d3.select(this)._groups[0][0].tagName=="path") {
        id_tmp = "#CD" + d3.select(this).attr('id').match(/\d/)
        district_row = d3.select(id_tmp);
        district_map = d3.select(this);
      } else if (d3.select(this).attr('id')!="City") {
        id_tmp = d3.select(this).attr('longID').replace(/\s/g, '');
        district_row = d3.select(this);
        district_map = d3.select('#' + id_tmp);
      } else {
        district_row = d3.select(this);
        district_map = null;
      }

      // unhighlight the map
      if (district_map) district_map.classed('highlighted', false);

      // return cursors to default
      // d3.selectAll('.district').style('cursor','default');
      // d3.selectAll('.tableRow').style('cursor','default');

      // remove the map labels
      cd_label.text('');
      cd_councilmember.text('');
      cd_value.text('');

      // get the district text (for unhighlighting the corresponding row)
      if (district_map) {
        district_text = district_map.attr('label');
      } else {
        district_text = "City of Los Angeles";
      }

      // if variable selection is complete, unhighlight the district in the table
      if (selection_complete) {
        var locations = [{"long":"City of Los Angeles", "short":"City"},{"long": "Council District 1", "short":"CD1"},{"long": "Council District 2", "short":"CD2"},{"long": "Council District 3", "short":"CD3"},{"long": "Council District 4", "short":"CD4"},{"long": "Council District 5", "short":"CD5"},{"long": "Council District 6", "short":"CD6"},{"long": "Council District 7", "short":"CD7"},{"long": "Council District 8", "short":"CD8"},{"long": "Council District 9", "short":"CD9"},{"long": "Council District 10", "short":"CD10"},{"long": "Council District 11", "short":"CD11"},{"long": "Council District 12", "short":"CD12"},{"long": "Council District 13", "short":"CD13"},{"long": "Council District 14", "short":"CD14"},{"long": "Council District 15", "short":"CD15"}];
        var locations_long = locations.map(function (d) {return d.long});
        var locations_short = locations.map(function (d) {return d.short});
        var index_tmp = locations_long.indexOf(district_text);
        var id_tmp = '#' + locations_short[index_tmp];
        d3.select(id_tmp).selectAll('text').attr('style', 'font-weight:normal');
        d3.select(id_tmp).select('.background').attr('style', 'stroke: none; fill:none');
        d3.select('#City').selectAll('text').attr('style', 'font-weight:normal; font-size:14px; font-style:italic');
      }
    }
  }

  // clicking the map title or the gray traingle will toggle the variable selection div
  toggleSelectionDiv = function() {
    $('#selectionDiv').fadeToggle(0);
    $('#collapse').fadeToggle(0);
    $('#expand').fadeToggle(0);
  };

  d3.select('#mapTitle').on('click', toggleSelectionDiv);
  d3.select('#collapse').on('click', toggleSelectionDiv);
  d3.select('#expand').on('click', toggleSelectionDiv);









  // initial settings for the map and table //

  // function for randomizing the colors
  // https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
  function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }
  defaultColors = shuffle(['#92a8d1','#f7cac9','#f7786b','#d5f4e6','#80ced6','#fefbd8','#618685','#ffef96','#db89e5','#b2b2b2','#f4e1d2','#deeaee','#b1cbbb','#eea29a','#82b74b']);
  // add the colors to the geojson so that each color is assigned to a district
  for (i=0; i<defaultColors.length; i++) {
    geofeatures[i].fill = defaultColors[i];
  }

  mapLayer.selectAll('path')
      .data(geofeatures)
      .enter().append('path')
      .attr('d', path)
      .attr('id', function (d) {return d.properties.Council_District.replace(/\s/g, '');})
      .attr('label', function (d) {return d.properties.Council_District;})
      .attr('councilmember', function (d) {return d.properties.Councilmember;})
      .attr('value', '')
      .attr('style', function (d,i) {return 'fill: white'})
      .classed('selected', false)
      .classed('district', true)
      .attr('vector-effect', 'non-scaling-stroke')
      .on('click', mouseclick)
      .on('mouseover', mouseover)
      .on('mouseleave', mouseout);

  // data table on the right
  var tableGroup = mapLayer.append('g').attr('id', 'table');

  // create a group for each row
  // var locations = ["City of Los Angeles","Council District 1","Council District 2","Council District 3","Council District 4","Council District 5","Council District 6","Council District 7","Council District 8","Council District 9","Council District 10","Council District 11","Council District 12","Council District 13","Council District 14","Council District 15"];
  var locations = [{"long":"City of Los Angeles", "short":"City"},{"long": "Council District 1", "short":"CD1"},{"long": "Council District 2", "short":"CD2"},{"long": "Council District 3", "short":"CD3"},{"long": "Council District 4", "short":"CD4"},{"long": "Council District 5", "short":"CD5"},{"long": "Council District 6", "short":"CD6"},{"long": "Council District 7", "short":"CD7"},{"long": "Council District 8", "short":"CD8"},{"long": "Council District 9", "short":"CD9"},{"long": "Council District 10", "short":"CD10"},{"long": "Council District 11", "short":"CD11"},{"long": "Council District 12", "short":"CD12"},{"long": "Council District 13", "short":"CD13"},{"long": "Council District 14", "short":"CD14"},{"long": "Council District 15", "short":"CD15"}]

  // create the groups and background rects for highlighting
  tableGroup.selectAll('g')
    .data(locations).enter()
    .append('g')
    .classed('tableRow', true)
    .classed('selected',false)
    .attr('id', function (d) {return d.short})
    .attr('longID', function (d) {return d.long})
    .on('click', mouseclick)
    .on('mouseover', mouseover)
    .on('mouseout', mouseout)
    .append('rect')
    .attr('id', function (d) {return d.short + 'Background'})
    .attr('class', 'background')
    .attr('x', -5)
    .attr('y', -15)
    .attr('height', '20px')
    .attr('width', '310px')
    .attr('style', 'fill: none; stroke: none');

  // add the location column
  locations.forEach(function(d) {
    var id_tmp = '#' + d.short;
    d3.select(id_tmp)
      .append('text')
      .attr('id', d.short + 'Name')
      .attr('x', 0)
      .attr('y', 0)
      .attr('fill', 'black')
      .attr('font-size', '14px')
      .attr('style', function(d) {
        if (d.short=='City') {
          out = 'font-weight:normal; font-style:italic';
        } else {
          out = 'font-weight:normal';
        }
        return(out);
      })
      .text(d.long);
  })

  // add the value column
  locations.forEach(function(d) {
    var id_tmp = '#' + d.short;
    d3.select(id_tmp)
      .append('text')
      .attr('id', d.short + 'Value')
      .attr('x', 140)
      .attr('y', 0)
      .attr('fill', 'black')
      .attr('font-size', '14px')
      .attr('style', function(d) {
        if (d.short=='City') {
          out = 'font-weight:normal; font-style:italic';
        } else {
          out = 'font-weight:normal';
        }
        return(out);
      })
      .text('value goes here');
  })

  // add the bar column
  locations.forEach(function(d) {
    var id_tmp = '#' + d.short;
    d3.select(id_tmp)
      .append('rect')
      .attr('id', d.short + 'Bar')
      .attr('class', 'bar')
      .attr('x', 240)
      .attr('y', -12)
      .attr('height', '12px')
      .attr('width', '0px')
      .attr('fill', 'steelblue');
  })

  // create a group for the titles and append text
  var titleGroup = tableGroup.append('g').attr('id', 'titleGroup');
  titleGroup.append('text').classed('title',true).attr('x', 0).attr('y', 0).attr('fill', 'black').attr('style', 'font-size: 14px; font-weight: bold').text('Location');
  titleGroup.append('text').classed('title',true).attr('id','units').attr('x', 140).attr('y', 0).attr('fill', 'black').attr('style', 'font-size: 14px; font-weight: bold').text('');

  // place all the text on the right hand side
  tableGroup.attr('transform', 'translate(460,70)');

  // make the table invisible
  d3.select('#table').selectAll('text').attr('fill', 'white');








  // color scale for the map
  var color = d3.scalePow().exponent(0.5).range(['white', d3.rgb('steelblue').darker()]);


  // function for updating the color scale
  // assumes that the data have been filtered to a single variable and a particular time period
  // use all available time periods for the selected indicator/subindicator
  // use Council District values only (not the city total)
  var updateColor = function() {
    // get time filter
    time_setting = d3.select('#timeToggleLabel').text();
    // undo the time filter
    time.filterAll();
    // create council_district filter
    var council_district = data.dimension(function (d) {
      return d["council_district"];
    });
    // filter out the City data
    council_district.filter(function (d) {return d!= "City of Los Angeles"});
    // get the min and max values
    minValue = value.bottom(1)[0].value;
    maxValue = value.top(1)[0].value;

    // set the color domain
    color.domain([minValue, maxValue]);
    // undo the council_district filter
    council_district.filterAll();
    // remove the council_district filter
    council_district.dispose();
    // redo the time filter
    time.filter(time_setting);
  }




  // function for updating the map.
  // assumes that the data have been filtered to a single variable and a particular time period
  // assumes that a color scale has already been set (and is available as "color" in the map_ready namespace)
  var updateMap = function() {
    // create council_district filter
    var council_district = data.dimension(function (d) {
      return d["council_district"];
    });
    var values = council_district.group().reduceSum(function (d) {
      return +d["value"];
    });

    var valueArray = values.all();
    var topFour = values.top(4);
    var topFourSum = topFour.map(function (d) {return +d.value}).reduce(function(a,b){return a+b});

    // undo the council_district filter
    council_district.filterAll();
    // remove the council_district filter
    council_district.dispose();

    // In the future I may need to make this more complex to do proper rounding, formatting
    getValue = function(d) {
      myValue = valueArray.filter(function(dd) {return dd.key==d.properties.Council_District})[0].value;
      return myValue;
    }

    getColor = function (d) {
      myColor = color(getValue(d));
      return myColor;
    }

    mapLayer.selectAll('path')
      .attr('value', getValue)
      .style('fill', getColor);

    // update the source
    varSource = value.top(1)[0].source;
    d3.select('#sourceSpan').html(varSource);
    d3.select('#source').attr('style', 'display:inline-block');

    // update the table
    // first, make the table visible
    d3.select('#table').selectAll('text').attr('fill', 'black');
    d3.selectAll('.tableRow').filter('.selected').select('.background').attr('style', 'stroke:gray; fill:none');

    // scale for the bars
    // exclude the city of LA if it's greater than or equal to the sum of the next three largest values

    // check that the city is in the top 4
    if (topFour.map(function(d){return d.key}).indexOf("City of Los Angeles")==-1) {
      // if not, no need to worry about it. we'll include it.
      var cityOnTop = false;
      var cityLarge = false;
    } else {
      // if so, see if it's sufficiently large to merit inclusion
      var cityOnTop = topFour.filter(function(d) {return d.key=="City of Los Angeles"})[0].value == topFour[0].value;
      var cityLarge = +topFour[0].value / topFourSum > 0.49;
    }

    // if the city total is big, exclude it
    if (cityOnTop & cityLarge) {
      max_tmp = topFour[1].value;
      var exclude_city = true;
    } else {
      max_tmp = topFour[0].value;
      var exclude_city = false;
    }
    barScale = d3.scaleLinear().domain([0,max_tmp]).range([0,60]);

    // update the values and sort
    var locations = [{"long":"City of Los Angeles", "short":"City"},{"long": "Council District 1", "short":"CD1"},{"long": "Council District 2", "short":"CD2"},{"long": "Council District 3", "short":"CD3"},{"long": "Council District 4", "short":"CD4"},{"long": "Council District 5", "short":"CD5"},{"long": "Council District 6", "short":"CD6"},{"long": "Council District 7", "short":"CD7"},{"long": "Council District 8", "short":"CD8"},{"long": "Council District 9", "short":"CD9"},{"long": "Council District 10", "short":"CD10"},{"long": "Council District 11", "short":"CD11"},{"long": "Council District 12", "short":"CD12"},{"long": "Council District 13", "short":"CD13"},{"long": "Council District 14", "short":"CD14"},{"long": "Council District 15", "short":"CD15"}];
    locations.forEach(function (d) {
      // get the group id for the table row for this location
      id_tmp = '#' + d.short;
      // sort the data by value
      sorted = valueArray.sort(function(a, b) {return b.value - a.value;});
      // get the value for this district
      text_tmp = sorted.filter(function (dd) {return dd.key==d.long})[0].value;
      // get the rank for this district
      sorted_locations = sorted.map(function(dd) {return dd.key});
      rank = sorted_locations.indexOf(d.long) + 1;
      // update the value
      d3.select(id_tmp + 'Value').text(formatAmount(+text_tmp));
      // update the bars
      if (exclude_city & d.short=="City") {
        d3.select(id_tmp + 'Bar').attr('width', 0);
      } else {
        d3.select(id_tmp + 'Bar').transition().duration(200).attr('width', barScale(text_tmp));
      }
      // reorder the districts
      d3.select(id_tmp).transition().delay(300).duration(100).attr('transform','translate(0,' + (rank * 20) + ')');
    })

  } // end of updateMap




  // function for removing all data from the visualization when changing variables
  var clearMap = function() {
    // change the map to the original colors
    mapLayer.selectAll('path').attr('style', function (d,i) {return 'fill: white'});

    // delete legend
    d3.selectAll('.legend').remove();

    // delete title and subtitle
    mapTitle.text('No variable selected');
    mapSubtitle.text('');

    // remove timeToggle if it exists
    d3.select('#timeToggleSVG').remove();
    d3.select('#timeToggleLabel').remove();
    d3.select('#timePrelabel').text('');

    // remove source
    d3.select('#source').attr('style', 'display:none');

    // make the table invisible
    d3.select('#table').selectAll('text').attr('fill', 'white');
    d3.select('#table').selectAll('.background').attr('style', 'stroke: none; fill:none');

    // make the bars invisible
    d3.select('#table').selectAll('.bar').attr('width',0);

  }


  // function for updating the time scale
  // assumes that the data have been filtered to a single variable
  var updateTimescale = function() {
    // if a district is selected and the selection is complete, add the time series for that district
    selected_district = d3.selectAll('.tableRow').filter('.selected');
    if (selected_district._groups[0].length==1 & selection_complete) {
      // create council_district filter
      var council_district = data.dimension(function (d) {
        return d["council_district"];
      });
      // select only the data for the selected district
      council_district.filter(selected_district.attr('longID'));

      // remove any time filters
      time.filterAll();

      // return the entries sorted by time, from earliest to latest
      dd = time.bottom(1e7);

      // pull the values
      var calendar_quarter = dd[0].cy_qtr!="";
      var fiscalOnly = dd[0].calendar_year=="NA" & dd[0].fiscal_year!="";
      if (calendar_quarter) {
        timePeriods = dd.map(function (d) {return d["cy_qtr"]});
      } else if (fiscalOnly) {
        timePeriods = dd.map(function (d) {return d["fiscal_year"]});
      } else {
        timePeriods = dd.map(function (d) {return d["calendar_year"]});
      }
      valuesTS = dd.map(function (d) {return d["value"]});

      // undo the time filter
      time.filterAll();
      // undo the council_district filter
      council_district.filterAll();
      // remove the council_district filter
      council_district.dispose();

      // create the data to pass to the toggle
      timeData = timePeriods.map(function(d,i) {return {'time':d, 'value':valuesTS[i]}});
    } else {
      // pick out all time periods with more than one observation using the current filters
      timePeriodCounts = time.group().reduceCount().all().filter(function (d) {return d.value > 0});
      timePeriods = timePeriodCounts.map(function (d) {return d.key});

      timeData = timePeriods.map(function(d,i) {return {'time':d, 'value':0}});
    }

  if (selection_complete) {
      // if timeToggle exists, save current year
      if (d3.select('#timePrelabel').text()!='') {
        var currentTime = d3.select('#timeToggleLabel').text();
      }
      // remove timeToggle if it exists, then add a new one
      d3.select('#timeToggleSVG').remove();
      d3.select('#timeToggleLabel').remove();
      var timeToggleSetup = make_timeToggle('#timeSparkline', '#timeLabel', timeData, time, updateColor, updateMap, currentTime);
      timeToggleSetup();

      // find the data frequency
      var topOne = value.top(1)[0];
      var calendar_quarter = topOne.cy_qtr!="";
      var calendar_year = topOne.calendar_year!="NA";
      var fiscal_year = topOne.fiscal_year!="";
      if (calendar_quarter) {
        var freq = "Calendar quarter";
      } else if (calendar_year) {
        var freq = "Calendar year";
      } else if (fiscal_year) {
        var freq = "Fiscal year";
      }
      d3.select('#timePrelabel').text(freq + ' (mouseover to change): ');
    } else {
      // remove timeToggle if it exists
      d3.select('#timeToggleSVG').remove();
      d3.select('#timeToggleLabel').remove();
      d3.select('#timePrelabel').text('');
    }
  }



  // function for updating the map title (also update the column title of data table)
  // assume the plotting variable has been chosen, and the mapTitle object
  // is available in the map_ready namespace
  updateTitle = function(maintext) {

    if (maintext!='') {
      // find the units
      unitsFilter = data.dimension(function (d) {return d.unit_of_measure});
      unitCounts = unitsFilter.group().reduceCount().all().filter(function (d) {return d.value > 0});
      units = unitCounts.map(function (d) {return d.key})[0];
      unitsFilter.dispose();

      // update the column title of the data table
      if (units=='#') {
        d3.select('#units').text('Number');
      } else if (units=='$') {
        d3.select('#units').text('Value ($)');
      } else if (units=='%') {
        d3.select('#units').text('Percent');
      }


      // find the unit text
      unitTextFilter = data.dimension(function (d) {return d.unit_text});
      unitTextCounts = unitTextFilter.group().reduceCount().all().filter(function (d) {return d.value > 0});
      unitText = unitTextCounts.map(function (d) {return d.key})[0];
      unitTextFilter.dispose();

      // update the title and subtitle
      mapTitle.text(maintext + ' (' + units + ')');
      mapSubtitle.text(unitText);

    } else {
      // blank out the title and subtitle
      mapTitle.text('No variable selected');
      mapSubtitle.text('');
    }
  }




  // set up variable selectors //

  // helper functions
  // reference: https://stackoverflow.com/questions/1801499/how-to-change-options-of-select-with-jquery
  removeOptions = function(selectId) {
    $(selectId + ' option:gt(0)').remove();
  }

  addOptions = function(selectId, options) {
    for (i=0; i<options.length; i++) {
      option = $('<option></option>').attr("value", options[i]).text(options[i].toLowerCase());
      $(selectId).append(option);
    }
  }



  // functionality for category selection //
  categories = category.group().all().map(function (d) {return d.key});
  addOptions('#selectCategory', categories);

  selectCategory = function(cat) {
    // remove indicator, subindicator, gender, and time filters
    time.filterAll();
    indicator.filterAll();
    subindicator.filterAll();
    current_subindicator = '';
    gender.filterAll();

    // mark the selection as incomplete
    selection_complete = false;
    gender_selected = false;
    subind_selected = false;

    // remove time toggle
    d3.select('#timeToggleSVG').remove();
    d3.select('#timeToggleLabel').remove();
    d3.select('#timePrelabel').text('');

    // If they choose "-", remove the filter; otherwise filter using given category
    if (cat=="-") {
      category.filterAll();
      d3.select('#indicatorDiv').attr('style','display:none');
    } else {
      category.filter(cat);
      d3.select('#indicatorDiv').attr('style','display:inline-block');
    }

    // show the indicator selector (this was done above) and hide the other selectors
    d3.select('#subindicatorDiv').attr('style','display:none');
    d3.select('#genderDiv').attr('style','display:none');

    // pick out all indicators with more than one observation using the current filters
    indicatorCounts = indicator.group().reduceCount().all().filter(function (d) {return d.value > 0});
    indicators = indicatorCounts.map(function (d) {return d.key});

    // change the options of the other selectors
    removeOptions('#selectIndicator');
    addOptions('#selectIndicator', indicators);

    // clear the map
    clearMap();
  }

  $('#selectCategory').attr('onchange', "selectCategory(this.value);")



  // functionality for indicator selection //
  indicators = indicator.group().all().map(function (d) {return d.key});
  addOptions('#selectIndicator', indicators);

  selectIndicator = function(ind) {
    // remove the filters that depend on this selection
    time.filterAll();
    subindicator.filterAll();
    current_subindicator = '';
    gender.filterAll();

    // mark the selection as incomplete (will assess later whether it is complete)
    selection_complete = false;
    gender_selected = false;
    subind_selected = false;

    // dispose of the time filter
    time.dispose();

    // remove time toggle
    d3.select('#timeToggleSVG').remove();
    d3.select('#timeToggleLabel').remove();
    d3.select('#timePrelabel').text('');

    // If they chose "-", remove the indicator filter.
    // Otherwise filter using given indicator.
    if (ind=="-") {
      indicator.filterAll();
      current_indicator = '';
    } else {
      indicator.filter(ind);
      current_indicator = ind;
    }

    // check whether gender is an option
    genderCounts = gender.group().reduceCount().all().filter(function (d) {return d.value > 0});
    genders = genderCounts.map(function (d) {return d.key});
    has_gender = genders.length > 1;

    // check whether subindicator is an option
    subindicatorCounts = subindicator.group().reduceCount().all().filter(function (d) {return d.value > 0});
    subindicators = subindicatorCounts.map(function (d) {return d.key});
    hasSubindicator = subindicators.length > 1;

    // check whether quarterly data are available
    var quarter = data.dimension(function (d) {
      return d["cy_qtr"];
    });
    quarterCounts = quarter.group().reduceCount().all().filter(function (d) {return d.value > 0});
    quarters = quarterCounts.map(function (d) {return d.key});
    hasQuarters = quarters.length > 1;
    quarter.dispose();

    // check if only fiscal years are available
    var topOne = value.top(1)[0]
    var fiscalOnly = topOne.calendar_year=="NA" & topOne.fiscal_year!="";

    // If they chose "-", hide gender and subindicator.
    // Otherwise proceed using the given filter.
    if (ind=="-") {
      d3.select('#genderDiv').attr('style','display:none');
      d3.select('#subindicatorDiv').attr('style','display:none');
      clearMap();
    } else {
      // create a new time filter depending on the choice
      if (hasQuarters) {
        time = data.dimension(function (d) {
          return d["cy_qtr"];
        });
      } else if (fiscalOnly) {
        time = data.dimension(function (d) {
          return d["fiscal_year"];
        });
      } else {
        time = data.dimension(function (d) {
          return d["calendar_year"];
        });
      }

      // if gender is an option, show gender selector and update categories
      if (has_gender) {
        d3.select('#genderDiv').attr('style','display:inline-block');
        removeOptions('#selectGender');
        addOptions('#selectGender', genders);
      } else {
        d3.select('#genderDiv').attr('style','display:none');
      }

      // if subindicator is an option, show selector and update categories
      if (hasSubindicator) {
        d3.select('#subindicatorDiv').attr('style','display:inline-block');
        removeOptions('#selectSubindicator');
        addOptions('#selectSubindicator', subindicators);
      } else {
        d3.select('#subindicatorDiv').attr('style','display:none');
      }

      // if neither gender nor subindicator are options, update the map.
      // otherwise, make it white
      if (!has_gender & !hasSubindicator) {
        selection_complete = true;
        updateTimescale();
        d3.selectAll('.legend').remove();
        makeLegend(map_svg_width * 0.4, map_svg_height * 0.5, 30, 5, color);
        updateTitle(ind);
        // hide the selection div
        $('#selectionDiv').fadeOut(0);
        $('#collapse').fadeOut(0);
        $('#expand').fadeIn(0);
      } else {
        clearMap();
      }
    }

  }

  $('#selectIndicator').attr('onchange', "selectIndicator(this.value);")


  // functionality for subindicator selection //
  selectSubindicator = function(sub) {
    // remove time filter
    time.filterAll();

    // update current subindicator
    current_subindicator = sub;

    // set selection as incomplete (will assess later whether to mark as complete)
    selection_complete = false;

    // if there are less than two genders, update the map (depending on selection).
    // otherwise, make each district white
    genderCounts = gender.group().reduceCount().all().filter(function (d) {return d.value > 0});
    genders = genderCounts.map(function (d) {return d.key});

    // filter as necessary
    if (sub=="-") {
      subindicator.filterAll();
    } else {
      subindicator.filter(sub);
      subind_selected = true;
    }

    // check that gender either isn't an option or has been selected already
    if (genders.length < 2 | gender_selected) {
      // If they chose "-", simply make the map white.
      // Otherwise, mark the selection as complete, and make the plot
      if (sub=="-") {
        clearMap();
      } else {
        selection_complete = true;
        updateTimescale();
        d3.selectAll('.legend').remove();
        makeLegend(map_svg_width * 0.4, map_svg_height * 0.5, 30, 5, color);

        // get indicator for title
        indicatorCounts = indicator.group().reduceCount().all().filter(function (d) {return d.value > 0});
        indicators = indicatorCounts.map(function (d) {return d.key});

        // get gender for title
        if (gender_selected) {
          gen = ", " + value.top(1)[0].gender;
        } else {
          gen = "";
        }

        updateTitle(current_indicator + ': ' + sub + gen);

        // hide the selection div
        $('#selectionDiv').fadeOut(0);
        $('#collapse').fadeOut(0);
        $('#expand').fadeIn(0);
      }
    } else {
      clearMap();
    }

  } // end of selectSubindicator()

  $('#selectSubindicator').attr('onchange', "selectSubindicator(this.value);")



  // functionality for gender selection //
  selectGender = function(gen) {

    // check whether subindicator is an option
    subindCounts = subindicator.group().reduceCount().all().filter(function (d) {return d.value > 0});
    subinds = subindCounts.map(function (d) {return d.key});

    // filter as necessary
    if (gen=="-") {
      gender.filterAll();
    } else {
      gender.filter(gen);
      gender_selected = true;
    }

    // If they choose "-", simply make the map white.
    // Otherwise filter using given gender and plot (as long as subindicator is selected or isn't an option).
    if (gen=="-") {
      gender_selected = false;
      selection_complete = false;
      clearMap();
    } else if (subinds.length < 2 | subind_selected) {
      selection_complete = true;
      updateTimescale();
      d3.selectAll('.legend').remove();
      makeLegend(map_svg_width * 0.4, map_svg_height * 0.5, 30, 5, color);

      // update the title
      if (current_subindicator=='') {
        var subind = '';
      } else {
        var subind = ': ' + current_subindicator ;
      }

      updateTitle(current_indicator + subind + ', ' + gen);

      // hide the selection div
      $('#selectionDiv').fadeOut(0);
      $('#collapse').fadeOut(0);
      $('#expand').fadeIn(0);
    }
  }

  $('#selectGender').attr('onchange', "selectGender(this.value);")



  // function for making legends
  function makeLegend(x, y, size, n, scale) {
    // make the legend object
    legend = map_svg.append('g')
      .classed('legend', true);

    var yTmp = y - (n * size * 0.5);

    var legendValues = [];
    var scaleMin = scale.domain()[0];
    var scaleMax = scale.domain()[1];
    var delta = (scaleMax - scaleMin) / n;
    for (i=1; i<(n+1); i++) {
      legendValues[i-1] = Math.round(scaleMin + delta * i);
    }
    var legendColors = legendValues.map(function (d) {return scale(d)});

    // loop to place the items
    for (var i=0; i<n; i++){
      legend.append('rect')
        .attr('x', x)
        .attr('y', yTmp + size * i)
        .attr('width', size)
        .attr('height', size)
        .attr('fill', d3.rgb(legendColors[i]))
        .attr('stroke', d3.rgb(legendColors[i]));
      legend.append('text')
        .attr('x', x + 1.5 * size)
        .attr('y', 4 + size/2 + yTmp + size * i)
        .attr('text-anchor', 'center')
        .attr('style', "font-size: " + d3.min([d3.max([10, (size / 2)]), 16]) + "px")
        .text(formatAmount(legendValues[i]));
    }
  }




// set up the carousel button
d3.select('#carousel')
  .style('cursor','pointer')
  .on('click', function() {
    if (d3.select('#carousel').text()=="On") {
      d3.select('#carousel').text('Off');
      d3.select('#carousel').style('color','black');
      carousel = false;
      // show the selection div
      $('#selectionDiv').fadeIn(0);
      $('#collapse').fadeIn(0);
      $('#expand').fadeOut(0);
    } else if (d3.select('#carousel').text()=="Off") {
      d3.select('#carousel').text('On');
      d3.select('#carousel').style('color','red');
      carousel = true;
      // hide the selection div
      $('#selectionDiv').fadeOut(0);
      $('#collapse').fadeOut(0);
      $('#expand').fadeIn(0);
    }
  });

var carousel = true;
var carouselState = 0;
var carouselStates = {
  0: {category: 'OUTPUT, INCOME, AND PRICES', indicator: 'MEDIAN HOUSEHOLD INCOME'},
  1: {category: 'OUTPUT, INCOME, AND PRICES', indicator: 'HOUSEHOLDS IN SNAP'},
  2: {category: 'EMPLOYMENT', indicator: 'UNEMPLOYMENT RATE'},
  3: {category: 'CONSTRUCTION, HOUSING, AND HOTELS', indicator: 'HOUSING VACANCY RATE'},
  4: {category: 'CONSTRUCTION, HOUSING, AND HOTELS', indicator: 'MULTI-FAMILY PERMITS'},
};

function changeVar(current_state) {
  var cat = carouselStates[current_state].category;
  var ind = carouselStates[current_state].indicator;
  var subind = carouselStates[current_state].subindicator;
  var gender = carouselStates[current_state].gender;
  selectCategory(cat);
  $('#selectCategory').val(cat);
  selectIndicator(ind);
  $('#selectIndicator').val(ind);
  if (subind) {
    selectSubindicator(subind);
    $('#selectSubindicator').val(subind);
  }
  if (gender) {
    selectGender(gender);
    $('#selectGender').val(gender);
  }

  d3.selectAll('.carousel').style('opacity',0.3);
  d3.select('#carousel'+carouselState).style('opacity',1);

  carouselState = (carouselState + 1) % Object.keys(carouselStates).length;

}

// initialize with the first state
changeVar(carouselState);

// default to having the City row selected
// document.getElementById('City').dispatchEvent(new MouseEvent('click'));

window.setInterval(function(){
  if (carousel) {
    changeVar(carouselState);
  }
}, 4000);


// if one of the carousel labels is clicked, change to show that variable
d3.selectAll('.carousel').on('click', function() {
  var number = +d3.select(this).attr('id').match(/\d+/g);
  carouselState = number;
  changeVar(carouselState);
})



} // end of map_ready



// label council districts (appears upon mouseover)
cd_label_x = 255;
cd_label = map_svg.append('text')
  .attr('x', cd_label_x)
  .attr('y', 50)
  .attr('text-anchor','left')
  .attr('style', 'font-size: 16px; font-weight: bold')
  .text('');

cd_councilmember = map_svg.append('text')
  .attr('x', cd_label_x)
  .attr('y', 70)
  .attr('text-anchor','left')
  .attr('style', 'font-size: 16px')
  .text('');

cd_value = map_svg.append('text')
  .attr('x', cd_label_x)
  .attr('y', 90)
  .attr('text-anchor','left')
  .attr('style', 'font-size: 16px')
  .text('');

/*
Helper functions
*/

// http://bl.ocks.org/eesur/4e0a69d57d3bfc8a82c2
d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};
