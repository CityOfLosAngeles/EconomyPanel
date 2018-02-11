// inspired by http://www.tnoda.com/blog/2013-12-19
// and https://bl.ocks.org/mbostock/3902569
function make_sparkline(elemId, numId, data, format) {

    var width = 80;
    var height = 20;
    var textwidth = 110;
    var margin = 5;
    var x = d3.scaleLinear().range([0, width - 2*margin]);
    var y = d3.scaleLinear().range([height - 2*margin, 0]);

    var line = d3.line()
               .x(function(d, i) { return x(i); })
               .y(function(d) { return y(d.y); });

    x.domain(d3.extent(data, function(d, i) { return i; }));
    y.domain(d3.extent(data, function(d) { return d.y; }));

    var max_index = d3.extent(data, function(d, i) { return i; })[1];

    var svg = d3.select(elemId)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('class', 'sparkline')
      .attr('transform', 'translate(' + margin + ',' + margin + ')');

    var path = svg.append('path')
      .datum(data)
      .attr('d', line);

    var focus = svg.append("g")
        .attr("class", "focus");

    var dot = focus.append("circle")
        .attr('cx', x(data.length - 1))
        .attr('cy', y(data[data.length - 1].y))
        .attr("r", 3);

    var myFormat;
    if (format=="amount") {
      myFormat = formatAmount;
    } else if (format=="dollar") {
      myFormat = formatDollarAmount;
    } else if (format=="percent") {
      myFormat = formatPercent;
    }

  sparkline = function() {
    svg.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .on("mousemove", mousemove);

    function mousemove() {
      var i = Math.min(Math.round(x.invert(d3.mouse(this)[0])), max_index);
      focus.select('circle').attr('cx', x(i)).attr('cy', y(data[i].y));
      d3.select(numId).select("text").text(data[i].x + ': ' + myFormat(data[i].y));
    }

    d3.select(numId)
      .append('svg')
      .attr('width', textwidth)
      .attr('height', height + 5)
      .append('text')
      .attr('x', 0)
      .attr('y', height)
      .attr('text-anchor', 'left')
      .attr('style', 'font-size:14px')
      .attr('fill', 'steelblue')
      .text(data[data.length - 1].x + ': ' + myFormat(data[data.length - 1].y));
  }

  // append properties of the graph to the function for later use
  sparkline.dot = dot;
  sparkline.x = x;
  sparkline.y = y;
  sparkline.data = data;

  // this currently isn't connected to anything, but it works. the 
  // idea is to make an external function for changing the info.
  // try to sync all the sparkline dates?
  sparkline.changeSelection = function(index){
    dot.attr('cx', x(data[index].x)).attr('cy', y(data[index].y));
  	d3.selectAll(numId).select('text').text(index + 1 + ': ' + myFormat(data[index].y));
  }

  return sparkline;
}
