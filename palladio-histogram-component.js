angular.module('palladioHistogram', ['palladio', 'palladio.services'])
	.run(['componentService', function(componentService) {
		var compileStringFunction = function (newScope, options) {

			newScope.dimension = newScope.dimension ? newScope.dimension : [];
			newScope.height = newScope.height ? newScope.height : 400;
			newScope.countBy = newScope.countBy ? newScope.countBy : null;

			var compileString = '<div data-palladio-histogram ';
			compileString += 'dimension="dimension" chart-height="height" count-by="countBy"></div>';

			return compileString;
		};

		componentService.register('histogram', compileStringFunction);
	}])
	.directive('palladioHistogram', function (palladioService, dataService) {
		return {
			scope : {
				dimension: '=',
				chartHeight: '=',
				countBy: '='
			},
			template : '<div id="main"></div>',
			link : {
				pre : function(scope, element) {

				},

				post : function(scope, element, attrs) {

					var marginVertical = 30;
					var marginHorizonal = 50;
					var yAxisWidth = 50;
					var xAxisHeight = 50;

					var xfilter = dataService.getDataSync().xfilter;
					var metadata = dataService.getDataSync().metadata;
					var dim = xfilter.dimension(function(d) { return +d[scope.dimension.key]; });
					var group = dim.group();
					reductio().exception(function(d) { return d[scope.countBy.key]; }).exceptionCount(true)(group);
					group.order(function(d) { return -d.exceptionCount; });

					element.height(scope.chartHeight);

					var main = d3.select(element[0]).select('#main');
					var svg = main.append('svg');

					svg.attr('height', scope.chartHeight);
					svg.attr('width', '100%');

					var width = 1000;
					var height = scope.chartHeight;

					var g = svg.append('g')
						.attr('transform', 'translate(' + marginHorizonal + ',' + marginVertical + ')');

					var x = d3.scale.linear()
								.domain([+dim.bottom(1)[0][scope.dimension.key], +dim.top(1)[0][scope.dimension.key]+1])
								.range([0, width - yAxisWidth - marginHorizonal*2]);

					console.log(group.top(Infinity));
					var y = d3.scale.linear()
								.domain([0, group.top(Infinity)[group.top(Infinity).length-1].value.exceptionCount])
								.range([0, height - marginVertical - xAxisHeight]);

					console.log(x.domain());
					console.log(y.domain());

					var xAxis = d3.svg.axis().scale(x).orient("bottom");
					var yAxis = d3.svg.axis().scale(y).orient("left");

					var brush = d3.svg.brush()
									.x(x)
									.on("brush", function() {
										dim.filter(brush.extent());
										palladioService.update();
									})
									.on("brushend", function() {
										if(!brush.empty()) {
											dim.filter(brush.extent());
										} else {
											dim.filterAll();
										}
										palladioService.update();
									});

					g.append("g")
						.attr("class", "x-axis axis x")
						.attr("transform", "translate(0," + (height - marginVertical - xAxisHeight) + ")")
						.call(xAxis);

					g.append("g")
						.attr("class", "y-axis axis y")
						.call(yAxis);

					g.append("g")
							.attr("class", "brush")
							.call(brush)
						.selectAll('rect')
							.attr('height', y.range()[1]);

					var barWidth = (x.range()[1] / x.domain()[1]) - 1;

					update();

					function update() {
						var bars = g.selectAll('.bar')
								.data(group.all(), function(d) { return d.key; });

						bars.exit().remove();
						bars.enter()
							.append('rect')
								.attr('class', 'bar')
								.attr('fill', 'gray');
						bars.attr('height', function(d) { return y(d.value.exceptionCount); })
								.attr('transform', function(d) { return 'translate(' + (x(d.key) + 0.5) + ',' + (y.range()[1] - y(d.value.exceptionCount)-0.5) + ')'; })
								.attr('width', barWidth);
					}

					palladioService.onUpdate('histogram', update);
				}
			}
		};
	});
