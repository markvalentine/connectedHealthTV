// Extend from VM as this is a particular application view.
Prodea.App.ConnectedHealth.Controls.blood_glucose = $.extend( new Prodea.VM.Base(), {
	oldReadings: {},
	allReadings: {},
	readings: ko.observableArray(),
	lastReading: ko.observable(),
	averageFasting: ko.observable(),
	averageAfterMeal: ko.observable(),
	averageRandom: ko.observable(),

	minutesVisible: null,
	readingsInterval: null,

    init: function() {

        // Trigger this 'out of sync', and only call this when the initial view is complete.
        setTimeout( $.proxy( function() { this.parent.loaded(); }, this), 1 );
		
		this.numDays = 7;
		this.range = {startDate: null, endDate: null};

		// Change timeframe when selected
		$('input[name=timeframe]').change(function(event){
			Prodea.App.ConnectedHealth.Controls.blood_glucose.numDays = event.target.value;
			Prodea.App.ConnectedHealth.Controls.blood_glucose.updateReadings(true);

			//STATS
			Prodea.WS.Stat([
				{ stat: 'ChangeVitalTimeFrameTotal', statValue: 1 },
				{ stat: 'ChangeVitalTimeFrameTo'+ event.target.value +'Days', statValue: 1 },
			]);
		});

		// Keybindings for time frame
		this.bindKeypress('RED', $.proxy(function () {
			$('input[name=timeframe][value=3]').click();
			//STATS
			Prodea.WS.Stat({ stat: 'ChangeVitalTimeFrameWithHotKey', statValue: 1});
		}, this));
		
		this.bindKeypress('GREEN', $.proxy(function () {
			$('input[name=timeframe][value=7]').click();
			//STATS
			Prodea.WS.Stat({ stat: 'ChangeVitalTimeFrameWithHotKey', statValue: 1});
		}, this));
		
		this.bindKeypress('BLUE', $.proxy(function () {
			$('input[name=timeframe][value=30]').click();
			//STATS
			Prodea.WS.Stat({ stat: 'ChangeVitalTimeFrameWithHotKey', statValue: 1});
        }, this));
		
		this.bindKeypress('YELLOW', $.proxy(function () {
			Prodea.App.ConnectedHealth.Controls.blood_glucose.updateReadings(true);
        }, this));

        this.sliderUI = Prodea.UI.Slider('blood_glucose_slider', 'Prodea.App.ConnectedHealth.Controls.blood_glucose.sliderUI', {
			direction: 'V',
			wrap: false,
			selectedIndex: 0,
			clickCallback: 'Prodea.App.ConnectedHealth.Controls.blood_glucose.bloodGlucoseSliderOnClickAction',
			focusNavigation: {up: "#lastGlucose", down: null, left: null, right: null},
            focusAction: {up: null, down: null, left: "Prodea.UI.AppMenu.focus();", right: null},
			animate: true,
            speed: 200,
			dmaScroll: true
		});
		
		this.updateReadings(true);
		this.readingsInterval = setInterval(Prodea.App.ConnectedHealth.Controls.blood_glucose.updateReadings, 10*1000);

		this.readings.subscribe(function(){
			Prodea.App.ConnectedHealth.Controls.blood_glucose.sliderUI.init();
		});

        //STATS
        Prodea.WS.Stat({ stat: 'BloodGlucosePageViews', statValue: 1});
		this.minutesVisible = setInterval( function () { Prodea.WS.Stat({ stat: 'MinutesVisibleBloodGlucose', statValue: 1 }); }, 60 * 1000);
    },

    _focus: function() {
        Prodea.Nav.focus('#lastGlucose');
        Prodea.UI.AppMenu.blur();
    },

    cleanUp: function() {
        clearInterval(Prodea.App.ConnectedHealth.Controls.blood_glucose.minutesVisible);
        clearInterval(Prodea.App.ConnectedHealth.Controls.blood_glucose.readingsInterval);
    },
	
	// Get last readings and readings for range
	updateReadings() {
		Prodea.App.ConnectedHealth.Controls.blood_glucose.getReadings();
		Prodea.App.ConnectedHealth.Controls.blood_glucose.getLastReading();
	},

	getLastReading: function(showLoading){
		if (Prodea.App.ConnectedHealth.isAuth) {
            if (showLoading) Prodea.UI.Loading.show();
			$.ajax({
                url: Prodea.App.ConnectedHealth.MinervaURL + "moObservation/getVitals",
                type: "POST",
                headers: {
                    'api-info': "V3|appVerson|deviceBrand|deviceModel|deviceScreenResolution|deviceOs|deviceOsVersion|deviceNetworkProvider|deviceNetworkType",
                    'x-auth-token': Prodea.App.ConnectedHealth.loginToken
                },
                contentType: "text/plain",
                data: '{codeList: [\"' + Prodea.App.ConnectedHealth.codes.random + '\", \"' + Prodea.App.ConnectedHealth.codes.fasting + '\", \"' + Prodea.App.ConnectedHealth.codes.after_meal + '\"], patientId: ' + Prodea.App.ConnectedHealth.user.patientId + ', _count: \"1\"}',
                success: function(response){
					// Must merge all 3 types of readings to get single last reading
					all = Prodea.App.ConnectedHealth.Controls.blood_glucose.mergeAndSortGlucoseReadings(response.result);
					Prodea.App.ConnectedHealth.Controls.blood_glucose.lastReading(all['0']);

                    Prodea.UI.Loading.hide();
                },
                statusCode: {
                    401: function() {
						Prodea.UI.Loading.hide();
						Prodea.App.ConnectedHealth.connectionTimeout(true);
                        Prodea.UI.Dialog.Alert("Your connection has timmed out, please log in again");
                    },
                    404: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Readings not found");
                    },
                    500: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Internal service error, please try again");
                    }
                },
            });
        } else {
            Prodea.App.ConnectedHealth.logout(true);
        }
	},
	
	getReadings: function(showLoading) {
        if (Prodea.App.ConnectedHealth.isAuth) {
            if (showLoading) Prodea.UI.Loading.show();            
			this.range = Prodea.App.ConnectedHealth.getDateRange(this.numDays);
			$.ajax({
                url: Prodea.App.ConnectedHealth.MinervaURL + "moObservation/getVitals",
                type: "POST",
                headers: {
                    'api-info': "V3|appVerson|deviceBrand|deviceModel|deviceScreenResolution|deviceOs|deviceOsVersion|deviceNetworkProvider|deviceNetworkType",
                    'x-auth-token': Prodea.App.ConnectedHealth.loginToken
                },
                contentType: "text/plain",
                data: '{codeList: [\"' + Prodea.App.ConnectedHealth.codes.fasting + '\", \"' + Prodea.App.ConnectedHealth.codes.after_meal + '\", \"' + Prodea.App.ConnectedHealth.codes.random + '\"], patientId: ' + Prodea.App.ConnectedHealth.user.patientId + ', _skipCount: \"true\", startDate: \"' + this.range.startDate + '\", endDate:\"' + this.range.endDate + '\"}',
                success: function(response){

					all = Prodea.App.ConnectedHealth.Controls.blood_glucose.mergeAndSortGlucoseReadings(response.result);

					Prodea.App.ConnectedHealth.Controls.blood_glucose.readings(all);
					Prodea.App.ConnectedHealth.Controls.blood_glucose.getAllReadingsForDeatil(all);

					avgFasting = Prodea.App.ConnectedHealth.getAverage(response.result[Prodea.App.ConnectedHealth.codes.fasting], Prodea.App.ConnectedHealth.Controls.blood_glucose.numDays);
					avgAfter = Prodea.App.ConnectedHealth.getAverage(response.result[Prodea.App.ConnectedHealth.codes.after_meal], Prodea.App.ConnectedHealth.Controls.blood_glucose.numDays);
					avgRandom = Prodea.App.ConnectedHealth.getAverage(response.result[Prodea.App.ConnectedHealth.codes.random], Prodea.App.ConnectedHealth.Controls.blood_glucose.numDays);
					
					Prodea.App.ConnectedHealth.Controls.blood_glucose.averageFasting(avgFasting);
					Prodea.App.ConnectedHealth.Controls.blood_glucose.averageAfterMeal(avgAfter);
					Prodea.App.ConnectedHealth.Controls.blood_glucose.averageRandom(avgRandom);

					Prodea.App.ConnectedHealth.Controls.blood_glucose.initializeGraph(response.result);
					// Prodea.App.ConnectedHealth.Controls.blood_glucose.displayReadings(response.result);
					// Prodea.App.ConnectedHealth.Controls.blood_glucose.displayAverageFasting(response.result);
					// Prodea.App.ConnectedHealth.Controls.blood_glucose.displayAverageAfterMeal(response.result);
					// Prodea.App.ConnectedHealth.Controls.blood_glucose.displayNumReadings(response.result);

                    Prodea.UI.Loading.hide();
                },
                statusCode: {
                    401: function() {
						Prodea.UI.Loading.hide();
						Prodea.App.ConnectedHealth.connectionTimeout(true);
                        Prodea.UI.Dialog.Alert("Your connection has timmed out, please log in again");
                    },
                    404: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Readings not found");
                    },
                    500: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Internal service error, please try again");
                    }
                },
            });
        } else {
            Prodea.App.ConnectedHealth.logout(true);
        }
	},
	
	initializeGraph: function(response){
		timeFormat = 'MM/DD/YYYY HH:mm';
		fasting = response[Prodea.App.ConnectedHealth.codes.fasting];
		after_meal = response[Prodea.App.ConnectedHealth.codes.after_meal];
		random = response[Prodea.App.ConnectedHealth.codes.random];

		if (JSON.stringify(this.allReadings) != JSON.stringify(this.oldReadings)) {
			tempString = JSON.stringify(this.allReadings);
			this.oldReadings = JSON.parse(tempString);

			fastingData = [];
			afterMealData = [];
			randomData = [];

			if (fasting) {
				$.each(fasting, function(index, value){
						fastingData.push({
						x: moment(value.date).format(timeFormat),
						y: value.value - 0
					});
				});	
			}

			if (after_meal) {
				$.each(after_meal, function(index, value){
					afterMealData.push({
						x: moment(value.date).format(timeFormat),
						y: value.value - 0
					});
				});
			}

			if (random) {
				$.each(random, function(index, value){
					randomData.push({
						x: moment(value.date).format(timeFormat),
						y: value.value - 0
					});
				});
			}

			ctx = $("#bloodGlucoseGraph");
			
			config = {
				type: 'line',
				data: {
					datasets: [{
						label: 'Fasting',
						backgroundColor: '#FF7979',
						borderColor: '#FF7979',
						fill: false,
						data: fastingData,
					}, {
						label: 'After Meal',
						backgroundColor: '#81B6FC',
						borderColor: '#81B6FC',
						fill: false,
						data: afterMealData,
					}, {
						label: 'Random Readings',
						backgroundColor: '#837EA3',
						borderColor: '#837EA3',
						fill: false,
						data: randomData,
					}]
				},
				options: {
					title: {
						text: 'Blood Glucose'
					},
					scales: {
						xAxes: [{
							type: 'time',
							time: {
								format: timeFormat,
								// round: 'day'
								// tooltipFormat: 'll HH:mm',
								max: this.range.endDate,
								min: this.range.startDate,
								minUnit: 'day',
								// bounds: 'data'
							},
							scaleLabel: {
								display: true,
								labelString: "Last " + this.numDays + ' Days'
							}
						}],
						yAxes: [{
							scaleLabel: {
								display: true,
								labelString: 'mm/dL'
							}
						}]
					},
				}
			};
			
			new Chart(ctx, config);
		}
	},

	// Adds all readings together and sorts by date
	mergeAndSortGlucoseReadings: function(readings) {
		fasting = readings[Prodea.App.ConnectedHealth.codes.fasting];
		after_meal = readings[Prodea.App.ConnectedHealth.codes.after_meal];
		random = readings[Prodea.App.ConnectedHealth.codes.random];

		all = [];

		if(fasting) { $.merge(all, fasting); }
		if(after_meal) { $.merge(all, after_meal); }
		if(random) { $.merge(all, random); }

		if (all) {
			all.sort(function(obj1, obj2) {
				return moment(obj2.date) - moment(obj1.date);
			});
		}

		return all;
	},

	getAllReadingsForDeatil: function(readings) {
		this.allReadings = {};
		$.each(readings, function(index, value){
			Prodea.App.ConnectedHealth.Controls.blood_glucose.allReadings[value.id] = value;
		});
	},

	bloodGlucoseSliderOnClickAction(id, index) {
        //STATS
		Prodea.WS.Stat({ stat: 'VitalDetailOpened', statValue: 1 });
		
		value = $('#'+id).val();
		if (value) {
			this.displayBloodGlucoseDetail(this.allReadings[value]);
		}
	},

	displayBloodGlucoseDetail: function(reading) {
        overlayString = '<div class="content-box"><h2>Blood Glucose</h2><table>';
        overlayString += '<tr><th>Value: </th><td>' + reading.value + ' ' + reading.unit + '</td></tr>';
        overlayString += '<tr><th>Type: </th><td>' + reading.code + '</td></tr>';
        overlayString += '<tr><th>Entered By: </th><td>' + reading.sourceDetails.name + '</td></tr>';
        overlayString += '<tr><th>Date: </th><td>' + moment(reading.date).format('DD MMMM YYYY') + '</td></tr>';
        overlayString += '<tr><th>Time: </th><td>' + moment(reading.date).format('h:mm A') + '</td></tr>';
        overlayString += '</table><button id="dismissBloodGlucose" onClick="Prodea.App.ConnectedHealth.Controls.blood_glucose.hideBloodGlucoseDetail()">Done</button></div>';
        Prodea.App.ConnectedHealth.showOverlay(overlayString, '#dismissBloodGlucose', this.hideBloodGlucoseDetail);
    },

    hideBloodGlucoseDetail: function() {
        Prodea.App.ConnectedHealth.hideOverlay(function() {
			Prodea.Nav.focus('#blood_glucose_slider > ul > li\[lastActive=true\]');
		});
    },
    
    
});
