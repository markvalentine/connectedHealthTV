// Extend from VM as this is a particular application view.
Prodea.App.ConnectedHealth.Controls.blood_oxygen = $.extend( new Prodea.VM.Base(), {
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
        help = document.getElementById("Views");
		
		this.numDays = 7;
		this.range = {startDate: null, endDate: null};

		// Change timeframe when selected
		$('input[name=timeframe]').change(function(event){
			Prodea.App.ConnectedHealth.Controls.blood_oxygen.numDays = event.target.value;
			Prodea.App.ConnectedHealth.Controls.blood_oxygen.updateReadings(true);

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
			Prodea.App.ConnectedHealth.Controls.blood_oxygen.updateReadings(true);
        }, this));

        this.sliderUI = Prodea.UI.Slider('blood_oxygen_slider', 'Prodea.App.ConnectedHealth.Controls.blood_oxygen.sliderUI', {
			direction: 'V',
			wrap: false,
			selectedIndex: 0,
			clickCallback: 'Prodea.App.ConnectedHealth.Controls.blood_oxygen.bloodOxygenSliderOnClickAction',
			focusNavigation: {up: "#lastOxygen", down: null, left: null, right: null},
            focusAction: {up: null, down: null, left: "Prodea.UI.AppMenu.focus();", right: null},
			animate: true,
            speed: 200,
			dmaScroll: true
        });
		
		this.allReadings = {};

		this.updateReadings(true);
		this.readingsInterval = setInterval(Prodea.App.ConnectedHealth.Controls.blood_oxygen.updateReadings, 10*1000);

		this.readings.subscribe(function(){
			Prodea.App.ConnectedHealth.Controls.blood_oxygen.sliderUI.init();
		});

        //STATS
        Prodea.WS.Stat({ stat: 'BloodOxygenPageViews', statValue: 1});
		this.minutesVisible = setInterval( function () { Prodea.WS.Stat({ stat: 'MinutesVisibleBloodOxygen', statValue: 1 }); }, 60 * 1000);
    },

    _focus: function() {
        Prodea.Nav.focus('#lastOxygen');
        Prodea.UI.AppMenu.blur();
	},

    cleanUp: function() {
        clearInterval(Prodea.App.ConnectedHealth.Controls.blood_oxygen.minutesVisible);
		clearInterval(Prodea.App.ConnectedHealth.Controls.blood_oxygen.readingsInterval);
    },
	
	// Get last readings and readings for range
	updateReadings() {
		Prodea.App.ConnectedHealth.Controls.blood_oxygen.getReadings();
		Prodea.App.ConnectedHealth.Controls.blood_oxygen.getLastReading();
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
                data: '{codeList: [\"' + Prodea.App.ConnectedHealth.codes.respiration_rate + '\"], patientId: ' + Prodea.App.ConnectedHealth.user.patientId + ', _count: \"1\"}',
                success: function(response){
					Prodea.App.ConnectedHealth.Controls.blood_oxygen.lastReading(response.result[Prodea.App.ConnectedHealth.codes.respiration_rate]['0']);
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
                data: '{codeList: [\"' + Prodea.App.ConnectedHealth.codes.respiration_rate + '\"], patientId: ' + Prodea.App.ConnectedHealth.user.patientId + ', _skipCount: \"true\", startDate: \"' + this.range.startDate + '\", endDate:\"' + this.range.endDate + '\"}',
                success: function(response){
					Prodea.App.ConnectedHealth.Controls.blood_oxygen.readings(response.result[Prodea.App.ConnectedHealth.codes.respiration_rate]);
					Prodea.App.ConnectedHealth.Controls.blood_oxygen.getAllReadingsForDeatil(response.result[Prodea.App.ConnectedHealth.codes.respiration_rate]);

					avg = Prodea.App.ConnectedHealth.getAverage(response.result[Prodea.App.ConnectedHealth.codes.respiration_rate], Prodea.App.ConnectedHealth.Controls.blood_oxygen.numDays);
					Prodea.App.ConnectedHealth.Controls.blood_oxygen.average(avg);
					
					Prodea.App.ConnectedHealth.Controls.blood_oxygen.initializeGraph(response.result);
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
		respiration_rate = response[Prodea.App.ConnectedHealth.codes.respiration_rate];
		
		if (JSON.stringify(this.allReadings) != JSON.stringify(this.oldReadings)) {
			tempString = JSON.stringify(this.allReadings);
			this.oldReadings = JSON.parse(tempString);
			
			data = [];

			if (respiration_rate) {
				$.each(respiration_rate, function(index, value){
					data.push({
						x: moment(value.date).format(timeFormat),
						y: value.value - 0
					});
				});
			}

			ctx = $("#bloodOxygenGraph");
			
			config = {
				type: 'line',
				data: {
					datasets: [{
						label: 'Respiration Rate',
						backgroundColor: '#81B6FC',
						borderColor: '#81B6FC',
						fill: false,
						data: data,
					}]
				},
				options: {
					title: {
						text: 'Respiration Rate'
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
								labelString: 'breaths/min'
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
			Prodea.App.ConnectedHealth.Controls.blood_oxygen.allReadings[value.id] = value;
		});
	},

	bloodOxygenSliderOnClickAction(id, index) {
        //STATS
		Prodea.WS.Stat({ stat: 'VitalDetailOpened', statValue: 1 });
		
		value = $('#'+id).val();
		if (value) {
			this.displayBloodOxygenDetail(this.allReadings[value]);
		}
	},

	displayBloodOxygenDetail: function(reading) {
        overlayString = '<div class="content-box"><h2>Blood Oxygen</h2><table>';
        overlayString += '<tr><th>Value: </th><td>' + reading.value + ' ' + reading.unit + '</td></tr>';
        overlayString += '<tr><th>Entered By: </th><td>' + reading.sourceDetails.name + '</td></tr>';
        overlayString += '<tr><th>Date: </th><td>' + moment(reading.date).format('DD MMMM YYYY') + '</td></tr>';
        overlayString += '<tr><th>Time: </th><td>' + moment(reading.date).format('h:mm A') + '</td></tr>';
        overlayString += '</table><button id="dismissBloodOxygen" onClick="Prodea.App.ConnectedHealth.Controls.blood_oxygen.hideBloodOxygenDetail()">Done</button></div>';
        Prodea.App.ConnectedHealth.showOverlay(overlayString, '#dismissBloodOxygen', this.hideBloodOxygenDetail);
    },

    hideBloodOxygenDetail: function() {
        Prodea.App.ConnectedHealth.hideOverlay(function() {
			Prodea.Nav.focus('#blood_oxygen_slider > ul > li\[lastActive=true\]');
		});
    },
    
});
