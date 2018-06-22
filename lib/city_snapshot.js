var myVar;

queue()
  .defer(d3.csv, 'data/EconomyPanel.csv')
  .await(data_ready)

function data_ready(error, econdata) {
  if (error) throw error;

  // set up crossfilter on the economic data
  var data = crossfilter(econdata);

  // set up filters
  var indicator = data.dimension(function (d) {return d["indicator"];});
  var time = data.dimension(function (d) {return d["calendar_year"];});
  var council_district = data.dimension(function(d) {return d["council_district"]})

  // select non-city data and remove it
  council_district.filter(function (d) {return d.toLowerCase().indexOf("city of los angeles") === -1 && d.toLowerCase().indexOf("city") === -1});
  data.remove();

  // remove the council_district filter
  council_district.dispose();

  // pull population, income, unemployment, and permit data
  indicator.filter(function(d) {return d=="POPULATION"});
  population = time.bottom(1e7);
  population.forEach(function(d) {d.x = d.calendar_year; d.y = +d.value})

  indicator.filter(function(d) {return d=="MEDIAN HOUSEHOLD INCOME"});
  income = time.bottom(1e7);
  income.forEach(function(d) {d.x = d.calendar_year; d.y = +d.value})

  indicator.filter(function(d) {return d=="UNEMPLOYMENT RATE"});
  unemployment = time.bottom(1e7);
  unemployment.forEach(function(d) {d.x = d.calendar_year; d.y = +d.value})

  indicator.filter(function(d) {return d=="MULTI-FAMILY PERMITS"});
  permits = time.bottom(1e7);
  myVar = permits;
  permits.forEach(function(d) {d.x = d["cy_qtr"].replace('-','q'); d.y = +d.value})

  // create sparklines for each indicator
  var populationSetup = make_sparkline('#PopSparkline', '#PopLabel', population, "amount");
  populationSetup();

  var incomeSetup = make_sparkline('#IncSparkline', '#IncLabel', income, "dollar");
  incomeSetup();

  var unemploymentSetup = make_sparkline('#URSparkline', '#URLabel', unemployment, "percent");
  unemploymentSetup();

  var permitsSetup = make_sparkline('#MFPSparkline', '#MFPLabel', permits, "amount");
  permitsSetup();

}
