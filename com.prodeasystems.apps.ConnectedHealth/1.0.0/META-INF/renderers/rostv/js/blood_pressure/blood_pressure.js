// Extend from VM as this is a particular application view.
Prodea.App.ConnectedHealth.Controls.blood_pressure = $.extend( new Prodea.VM.Base(), {
	oldReadings: {},
	allReadings: {},
	readings: ko.observable(),
	lastReading: ko.observable(),
	averageSystolic: ko.observable(),
	averageDiastolic: ko.observable(),

	minutesVisible: null,
	readingsInterval: null,

    init: function() {

        // Trigger this 'out of sync', and only call this when the initial view is complete.
        setTimeout( $.proxy( function() { this.parent.loaded(); }, this), 1 );
		
		this.numDays = 7;
		this.range = {startDate: null, endDate: null};

		// Change timeframe when selected
		$('input[name=timeframe]').change(function(event){
			Prodea.App.ConnectedHealth.Controls.blood_pressure.numDays = event.target.value;
			Prodea.App.ConnectedHealth.Controls.blood_pressure.updateReadings(true);

			// //STATS
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
			Prodea.App.ConnectedHealth.Controls.blood_pressure.updateReadings(true);
        }, this));

        this.sliderUI = Prodea.UI.Slider('blood_pressure_slider', 'Prodea.App.ConnectedHealth.Controls.blood_pressure.sliderUI', {
			direction: 'V',
			wrap: false,
			selectedIndex: 0,
			clickCallback: 'Prodea.App.ConnectedHealth.Controls.blood_pressure.bloodPressureSliderOnClickAction',
			focusNavigation: {up: "#lastBloodPressure", down: null, left: null, right: null},
            focusAction: {up: null, down: null, left: "Prodea.UI.AppMenu.focus();", right: null},
			animate: true,
            speed: 200,
			dmaScroll: true
		});
		
		this.updateReadings(true);
		this.readingsInterval = setInterval(Prodea.App.ConnectedHealth.Controls.blood_pressure.updateReadings, 10*1000);

		this.readings.subscribe(function(){
			Prodea.App.ConnectedHealth.Controls.blood_pressure.sliderUI.init();
		});

        //STATS
        Prodea.WS.Stat({ stat: 'BloodPressurePageViews', statValue: 1});
		this.minutesVisible = setInterval( function () { Prodea.WS.Stat({ stat: 'MinutesVisibleBloodPressure', statValue: 1 }); }, 60 * 1000);
    },

    _focus: function() {
        Prodea.Nav.focus('#lastBloodPressure');
        Prodea.UI.AppMenu.blur();
	},

    cleanUp: function() {
        clearInterval(Prodea.App.ConnectedHealth.Controls.blood_pressure.minutesVisible);
        clearInterval(Prodea.App.ConnectedHealth.Controls.blood_pressure.readingsInterval);
    },
	
	// Get last readings and readings for range
	updateReadings() {
		Prodea.App.ConnectedHealth.Controls.blood_pressure.getReadings();
		Prodea.App.ConnectedHealth.Controls.blood_pressure.getLastReading();
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
                data: '{codeList: [\"' + Prodea.App.ConnectedHealth.codes.diastolic + '\", \"' + Prodea.App.ConnectedHealth.codes.systolic + '\"], patientId: ' + Prodea.App.ConnectedHealth.user.patientId + ', _count: \"1\"}',
                success: function(response){
					Prodea.App.ConnectedHealth.Controls.blood_pressure.lastReading({ systolic: response.result[Prodea.App.ConnectedHealth.codes.systolic]['0'], diastolic: response.result[Prodea.App.ConnectedHealth.codes.diastolic]['0'] });
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
                data: '{codeList: [\"' + Prodea.App.ConnectedHealth.codes.diastolic + '\", \"' + Prodea.App.ConnectedHealth.codes.systolic + '\"], patientId: ' + Prodea.App.ConnectedHealth.user.patientId + ', _skipCount: \"true\", startDate: \"' + this.range.startDate + '\", endDate:\"' + this.range.endDate + '\"}',
                success: function(response){

					Prodea.App.ConnectedHealth.Controls.blood_pressure.readings({ systolic: response.result[Prodea.App.ConnectedHealth.codes.systolic], diastolic: response.result[Prodea.App.ConnectedHealth.codes.diastolic] });
					Prodea.App.ConnectedHealth.Controls.blood_pressure.getAllReadingsForDeatil(response.result[Prodea.App.ConnectedHealth.codes.systolic], response.result[Prodea.App.ConnectedHealth.codes.diastolic]);

					avgSystolic = Prodea.App.ConnectedHealth.getAverage(response.result[Prodea.App.ConnectedHealth.codes.systolic], Prodea.App.ConnectedHealth.Controls.blood_pressure.numDays);
					averageDiastolic = Prodea.App.ConnectedHealth.getAverage(response.result[Prodea.App.ConnectedHealth.codes.diastolic], Prodea.App.ConnectedHealth.Controls.blood_pressure.numDays);
					Prodea.App.ConnectedHealth.Controls.blood_pressure.averageSystolic(avgSystolic);
					Prodea.App.ConnectedHealth.Controls.blood_pressure.averageDiastolic(averageDiastolic);

					Prodea.App.ConnectedHealth.Controls.blood_pressure.initializeGraph(response.result);
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
		systolic = response[Prodea.App.ConnectedHealth.codes.systolic];
		diastolic = response[Prodea.App.ConnectedHealth.codes.diastolic];

		if (JSON.stringify(this.allReadings) != JSON.stringify(this.oldReadings)) {
			tempString = JSON.stringify(this.allReadings);
			this.oldReadings = JSON.parse(tempString);

			systolicData = [];
			diastolicData = [];

			if (systolic) {
				$.each(systolic, function(index, value){
					systolicData.push({
						x: moment(value.date).format(timeFormat),
						y: value.value - 0
					});
				});
			}

			if (diastolic) {
				$.each(diastolic, function(index, value){
					diastolicData.push({
						x: moment(value.date).format(timeFormat),
						y: value.value - 0
					});
				});
			}

			ctx = $("#bloodPressureGraph");
			
			config = {
				type: 'line',
				data: {
					datasets: [{
						label: 'Systolic',
						backgroundColor: '#FF7979',
						borderColor: '#FF7979',
						fill: false,
						data: systolicData,
					}, {
						label: 'Diastolic',
						backgroundColor: '#9386F4',
						borderColor: '#9386F4',
						fill: false,
						data: diastolicData,
					}]
				},
				options: {
					title: {
						text: 'Blood Pressure'
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
								labelString: 'mmHg'
							}
						}]
					},
				}
			};
			
			new Chart(ctx, config);
		}
	},

	getAllReadingsForDeatil: function(systolic, diastolic) {
		this.allReadings = {};
		$.each(systolic, function(index, value){
			diastolicValue = diastolic[index];
			Prodea.App.ConnectedHealth.Controls.blood_pressure.allReadings[value.id] = {
				'systolic': value,
				'diastolic': diastolicValue
			};
		});
	},

	bloodPressureSliderOnClickAction(id, index) {
        //STATS
		Prodea.WS.Stat({ stat: 'VitalDetailOpened', statValue: 1 });
		
		value = $('#'+id).val();
		if (value) {
			readings = this.allReadings[value];
			this.displayBloodPressureDetail(readings.systolic, readings.diastolic);
		}
	},

	displayBloodPressureDetail: function(systolic, diastolic) {
        overlayString = '<div class="content-box"><h2>Blood Pressure</h2><table>';
        overlayString += '<tr><th>Systolic: </th><td>' + systolic.value + ' ' + systolic.unit + '</td></tr>';
        overlayString += '<tr><th>Diastolic: </th><td>' + diastolic.value + ' ' + diastolic.unit + '</td></tr>';
        overlayString += '<tr><th>Entered By: </th><td>' + systolic.sourceDetails.name + '</td></tr>';
        overlayString += '<tr><th>Date: </th><td>' + moment(systolic.date).format('DD MMMM YYYY') + '</td></tr>';
        overlayString += '<tr><th>Time: </th><td>' + moment(systolic.date).format('h:mm A') + '</td></tr>';
        overlayString += '</table><button id="dismissBloodPressure" onClick="Prodea.App.ConnectedHealth.Controls.blood_pressure.hideBloodPressureDetail()">Done</button></div>';
        Prodea.App.ConnectedHealth.showOverlay(overlayString, '#dismissBloodPressure', this.hideBloodPressureDetail);
    },

    hideBloodPressureDetail: function() {
        Prodea.App.ConnectedHealth.hideOverlay(function() {
			Prodea.Nav.focus('#blood_pressure_slider > ul > li\[lastActive=true\]');
		});
    },
    
});
