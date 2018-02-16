function make_timeToggle(elemId, numId, jsonData, timeFilter, updateColor, updateMap, currentTime) {

    // set width, height, textwidth
    var width = 200;
    var height = 20;
    var textwidth = 55;
    var margin = 5;

    // if a time period is passed to the function, get the index of that time period in the given time data object
    // if it's not given, return the last time period
    var currentTimeIndex;
    if (currentTime === undefined) {
      currentTimeIndex = jsonData.length - 1;
    } else {
      currentTimeIndex = jsonData.map(function(d) {return d.time}).indexOf(currentTime);
    }

    // create the x scale
    var x = d3.scaleLinear().range([0, width - 2*margin]);

    // create the y scale
    // change the range depending on the input (if it sums to zero, make the range constant, i.e. the output is a flat line)
    ySum = d3.sum(jsonData.map(function (d) {return d.value}))
    if (ySum==0) {
      var y = d3.scaleLinear().range([height/2, height/2]);
    } else {
      var y = d3.scaleLinear().range([height - margin, margin]);
    }

    // line object. shows the user the time range and may also plot a time series for a selected district.
    var line = d3.line()
               .x(function(d, i) { return x(i); })
               .y(function(d) { return y(d.value); });

    // domain for x and y scales, data-dependent
    x.domain(d3.extent(jsonData, function(d, i) { return i; }));
    y.domain(d3.extent(jsonData, function(d) { return +d.value; }));

    var max_index = d3.extent(jsonData, function(d, i) { return i; })[1];

    // create the time toggle SVG
    var svg = d3.select(elemId)
      .append('svg')
      .attr('id', 'timeToggleSVG')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('class', 'timeToggle')
      .attr('transform', 'translate(' + margin + ',0)');

    var path = svg.append('path')
      .datum(jsonData)
      .attr('d', line);

    var focus = svg.append("g")
        .attr("class", "focus");

    // dot shows the current time selection
    var dot = focus.append("circle")
        .attr('cx', x(currentTimeIndex))
        .attr('cy', y(jsonData[currentTimeIndex].value))
        .attr("r", 5);

  // timeToggle function. this is what the make_timeToggle function returns
  timeToggle = function() {
    svg.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .on("mousemove", mousemove);

    // change the time selection when the user mouses over the time toggle
    // uses the crossfilter "time" filter passed in to make_timeToggle
    function mousemove() {
      var i = Math.min(Math.round(x.invert(d3.mouse(this)[0])), max_index);
      focus.select('circle').attr('cx', x(i)).attr('cy', y(jsonData[i].value));
      d3.select(numId).select("text").text(jsonData[i].time);

      // using crossfilter, filter the data on the chosen time period
      timeFilter.filter(jsonData[i].time);

      // update the map
      updateMap();
    }

    // add the time label
    d3.select(numId)
      .append('svg')
      .attr('id', 'timeToggleLabel')
      .attr('width', textwidth)
      .attr('height', height)
      .append('text')
      .attr('x', 0)
      .attr('y', height * 0.75)
      .attr('text-anchor', 'left')
      .attr('style', 'font-size:14px')
      .attr('fill', 'steelblue')
      .text(jsonData[currentTimeIndex].time);

     // filter using the last date in the time period and update the map
     timeFilter.filter(jsonData[currentTimeIndex].time);
     updateColor();
     updateMap();
  }

  // append properties of the graph to the function for later use
  timeToggle.dot = dot;
  timeToggle.x = x;
  timeToggle.y = y;
  timeToggle.data = jsonData;

  return timeToggle;
}