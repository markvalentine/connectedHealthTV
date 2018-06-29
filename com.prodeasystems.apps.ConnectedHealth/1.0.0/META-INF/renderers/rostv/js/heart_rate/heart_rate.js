// Extend from VM as this is a particular application view.
Prodea.App.ConnectedHealth.Controls.heart_rate = $.extend( new Prodea.VM.Base(), {
	oldReadings: {},
	allReadings: {},
	readings: ko.observableArray(),
	lastReading: ko.observable(),
	average: ko.observable(),

	minutesVisible: null,
	readingsInterval: null,

    init: function() {

        // Trigger this 'out of sync', and only call this when the initial view is complete.
        setTimeout( $.proxy( function() { this.parent.loaded(); }, this), 1 );
		
		this.numDays = 7;
		this.range = {startDate: null, endDate: null};

		// Change Timeframe when selected
		$('input[name=timeframe]').change(function(event){
			Prodea.App.ConnectedHealth.Controls.heart_rate.numDays = event.target.value;
			Prodea.App.ConnectedHealth.Controls.heart_rate.updateReadings(true);

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
			Prodea.App.ConnectedHealth.Controls.heart_rate.updateReadings(true);
        }, this));

        this.sliderUI = Prodea.UI.Slider('heart_rate_slider', 'Prodea.App.ConnectedHealth.Controls.heart_rate.sliderUI', {
			direction: 'V',
			wrap: false,
			selectedIndex: 0,
			clickCallback: 'Prodea.App.ConnectedHealth.Controls.heart_rate.heartRateSliderOnClickAction',
			focusNavigation: {up: "#lastHeartRate", down: null, left: null, right: null},
            focusAction: {up: null, down: null, left: "Prodea.UI.AppMenu.focus();", right: null},
			animate: true,
            speed: 200,
			dmaScroll: true
		});
		
		this.updateReadings(true);
		this.readingsInterval = setInterval(Prodea.App.ConnectedHealth.Controls.heart_rate.updateReadings, 10*1000);

		this.readings.subscribe(function(){
			Prodea.App.ConnectedHealth.Controls.heart_rate.sliderUI.init();
		});

        //STATS
        Prodea.WS.Stat({ stat: 'HeartRatePageViews', statValue: 1});
		this.minutesVisible = setInterval( function () { Prodea.WS.Stat({ stat: 'MinutesVisibleHeartRate', statValue: 1 }); }, 60 * 1000);
    },

    _focus: function() {
        Prodea.Nav.focus('#lastHeartRate');
        Prodea.UI.AppMenu.blur();
	},

    cleanUp: function() {
		clearInterval(Prodea.App.ConnectedHealth.Controls.heart_rate.minutesVisible);
		clearInterval(Prodea.App.ConnectedHealth.Controls.heart_rate.readingsInterval);
	},
	
	// Get last readings and readings for range
	updateReadings() {
		Prodea.App.ConnectedHealth.Controls.heart_rate.getReadings();
		Prodea.App.ConnectedHealth.Controls.heart_rate.getLastReading();
	},

	// This is separate from get readings in case the last reading is outside the given range
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
                data: '{codeList: [\"' + Prodea.App.ConnectedHealth.codes.heart_rate + '\"], patientId: ' + Prodea.App.ConnectedHealth.user.patientId + ', _count: \"1\"}',
                success: function(response){
					Prodea.App.ConnectedHealth.Controls.heart_rate.lastReading(response.result[Prodea.App.ConnectedHealth.codes.heart_rate]['0']);
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
                data: '{codeList: [\"' + Prodea.App.ConnectedHealth.codes.heart_rate + '\"], patientId: ' + Prodea.App.ConnectedHealth.user.patientId + ', _skipCount: \"true\", startDate: \"' + this.range.startDate + '\", endDate:\"' + this.range.endDate + '\"}',
                success: function(response){
					Prodea.App.ConnectedHealth.Controls.heart_rate.readings(response.result[Prodea.App.ConnectedHealth.codes.heart_rate]);
					Prodea.App.ConnectedHealth.Controls.heart_rate.getAllReadingsForDeatil(response.result[Prodea.App.ConnectedHealth.codes.heart_rate]);

					avg = Prodea.App.ConnectedHealth.getAverage(response.result[Prodea.App.ConnectedHealth.codes.heart_rate], Prodea.App.ConnectedHealth.Controls.heart_rate.numDays);
					Prodea.App.ConnectedHealth.Controls.heart_rate.average(avg);
					
					Prodea.App.ConnectedHealth.Controls.heart_rate.initializeGraph(response.result);
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
	
	// Displays the graph
	// GET RID OF THESE REPEATS
	initializeGraph: function(response){
		timeFormat = 'MM/DD/YYYY HH:mm';
		heart_rate = response[Prodea.App.ConnectedHealth.codes.heart_rate];

		if (JSON.stringify(this.allReadings) != JSON.stringify(this.oldReadings)) {
			tempString = JSON.stringify(this.allReadings);
			this.oldReadings = JSON.parse(tempString);

			data = [];

			if (heart_rate) {
				$.each(heart_rate, function(index, value){
					data.push({
						x: moment(value.date).format(timeFormat),
						y: value.value - 0
					});
				});
			}

			ctx = $("#heartRateGraph");
			
			config = {
				type: 'line',
				data: {
					datasets: [{
						label: 'Heart Rate',
						backgroundColor: '#FFB1EE',
						borderColor: '#FFB1EE',
						fill: false,
						data: data,
					}]
				},
				options: {
					title: {
						text: 'Heart Rate'
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
							},
							scaleLabel: {
								display: true,
								labelString: "Last " + this.numDays + ' Days'
							}
						}],
						yAxes: [{
							scaleLabel: {
								display: true,
								labelString: 'beats/min'
							}
						}]
					},
				}
			};
			
			new Chart(ctx, config);
		}
	},

	getAllReadingsForDeatil: function(readings) {
		this.allReadings = {};
		$.each(readings, function(index, value){
			Prodea.App.ConnectedHealth.Controls.heart_rate.allReadings[value.id] = value;
		});
	},

	heartRateSliderOnClickAction(id, index) {
        //STATS
		Prodea.WS.Stat({ stat: 'VitalDetailOpened', statValue: 1 });
		
		value = $('#'+id).val();
		if (value) {
			this.displayHeartRateDetail(this.allReadings[value]);
		}
	},

	// Adds info to vital overlay
	displayHeartRateDetail: function(reading) {
        overlayString = '<div class="content-box"><h2>Heart Rate</h2><table>';
        overlayString += '<tr><th>Value: </th><td>' + reading.value + ' ' + reading.unit + '</td></tr>';
        overlayString += '<tr><th>Entered By: </th><td>' + reading.sourceDetails.name + '</td></tr>';
        overlayString += '<tr><th>Date: </th><td>' + moment(reading.date).format('DD MMMM YYYY') + '</td></tr>';
        overlayString += '<tr><th>Time: </th><td>' + moment(reading.date).format('h:mm A') + '</td></tr>';
        overlayString += '</table><button id="dismissHeartRate" onClick="Prodea.App.ConnectedHealth.Controls.heart_rate.hideHeartRateDetail()">Done</button></div>';
        Prodea.App.ConnectedHealth.showOverlay(overlayString, '#dismissHeartRate', this.hideHeartRateDetail);
    },

	// Hides vital overlay
    hideHeartRateDetail: function() {
        Prodea.App.ConnectedHealth.hideOverlay(function() {
			Prodea.Nav.focus('#heart_rate_slider > ul > li\[lastActive=true\]');
		});
    },

});
