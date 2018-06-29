// Extend from VM as this is a particular application view.
Prodea.App.ConnectedHealth.Controls.dashboard = $.extend( new Prodea.VM.Base(), {
    
    readings: ko.observable(),
    tasks: ko.observableArray(),
    taskCounts: ko.observable(),
    careProviders: ko.observableArray(),
    careProvidersObject: {},

    updatesInterval: null,

    init: function() {
        // Trigger this 'out of sync', and only call this when the initial view is complete.
        setTimeout( $.proxy( function() {
            this.parent.loaded();
            
        }, this), 1 );

        this.gridInstance = Prodea.UI.Grid('vitals-grid', 'Prodea.App.ConnectedHealth.Controls.dashboard.gridInstance', {
            rows: 3,
            cols: 2,
            shiftCallback: null,
            focusCallback: null,
            clickCallback: null,
            focusNavigation: {up: null, down: null, left: null, right: null},
            focusAction: {up: null, down: null, left: "Prodea.UI.AppMenu.focus();", right: "Prodea.Nav.focus('#task_slider > ul > li\[lastActive=true\]')"}
        });

        this.taskSliderUI = Prodea.UI.Slider('task_slider', 'Prodea.App.ConnectedHealth.Controls.dashboard.taskSliderUI', {
			direction: 'V',
			wrap: false,
            selectedIndex: 0,
            clickCallback: 'Prodea.App.ConnectedHealth.Controls.dashboard.taskOnClickAction',
			focusNavigation: {up: null, down: null, left: null, right: null},
            focusAction: {up: null, down: null, left: "Prodea.Nav.focus('#vitals-grid > ul > li\[lastActive=true\]')", right: null},
			animate: true,
            speed: 200,
			dmaScroll: true
        });
        
        this.getTaskCounts();
        this.getTasks();
        this.tasks.subscribe(function() {
            Prodea.App.ConnectedHealth.Controls.dashboard.taskSliderUI.init();
        });

        this.careProviders.subscribe(function(newValue) {
            // console.log("The careProviderIsNow " + newValue);
        });

        // if the user is already substantiated, get vitals,
        if (Prodea.App.ConnectedHealth.user) {
            this.getVitals();
            this.getUserDetails();
            Prodea.App.ConnectedHealth.Controls.dashboard.updatesInterval = setInterval(Prodea.App.ConnectedHealth.Controls.dashboard.updateDashboard, 5000);
        }
        
        this.gridInstance.init();
        // this.taskSliderUI.init();

        //Nav function for clicking each vital widget
        $(".blood_pressure").click(function(){
            Prodea.App.ConnectedHealth.stateHandler.vitalsOnClickAction('blood_pressure');
        });
        $(".blood_glucose").click(function(){
            Prodea.App.ConnectedHealth.stateHandler.vitalsOnClickAction('blood_glucose');
        });
        $(".blood_oxygen").click(function(){
            Prodea.App.ConnectedHealth.stateHandler.vitalsOnClickAction('blood_oxygen');
        });
        $(".weight").click(function(){
            Prodea.App.ConnectedHealth.stateHandler.vitalsOnClickAction('weight');
        });
        $(".heart_rate").click(function(){
            Prodea.App.ConnectedHealth.stateHandler.vitalsOnClickAction('heart_rate');
        });
        $(".temperature").click(function(){
            Prodea.App.ConnectedHealth.stateHandler.vitalsOnClickAction('temperature');
        });

        $(".vital-widget").click(function(){
            //STATS
            Prodea.WS.Stat({ stat: 'ClickOnVitalWidget', statValue: 1 });
        })

        //STATS
        Prodea.WS.Stat({ stat: 'DashboardPageViews', statValue: 1});
		this.minutesVisible = setInterval( function () { Prodea.WS.Stat({ stat: 'MinutesVisibleDashboard', statValue: 1 }); }, 60 * 1000);
    },

    _focus: function() {
        Prodea.Nav.focus('#vitals-grid > ul > li\[lastActive=true\]');
        Prodea.UI.AppMenu.blur();
    },

    cleanUp: function() {
        clearInterval(Prodea.App.ConnectedHealth.Controls.dashboard.updatesInterval);
        clearInterval(Prodea.App.ConnectedHealth.Controls.dashboard.minutesVisible);
    },

    updateDashboard: function() {
        Prodea.App.ConnectedHealth.Controls.dashboard.getVitals(false);
    },

    //Get the counts for each tasklist
    getTaskCounts: function(showLoading) {
        if (Prodea.App.ConnectedHealth.isAuth) {
            if (showLoading) { Prodea.UI.Loading.show(); }
            $.ajax({
                url: Prodea.App.ConnectedHealth.MinervaURL + "workflow/getTaskCountDetails",
                type: "POST",
                headers: {
                    'api-info': Prodea.App.ConnectedHealth.MinervaApiInfo,
                    'x-auth-token': Prodea.App.ConnectedHealth.loginToken
                },
                contentType: "text/plain",
                data: '{date: \"' + moment().toISOString(true) + '\"}',
                success: function(response){
                    Prodea.App.ConnectedHealth.Controls.dashboard.taskCounts(response.MyTasks);
                    Prodea.UI.Loading.hide();
                },
                statusCode: {
                    401: function() {
                        Prodea.UI.Loading.hide();
						Prodea.App.ConnectedHealth.connectionTimeout();
                        Prodea.UI.Dialog.Alert("Your connection has timmed out, please log in again");
                    },
                    404: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Tasks not found");
                    },
                    500: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Internal service error, please try again");
                    }
                },
            });
        } else {
            Prodea.App.ConnectedHealth.logout();
        }
    },

    //Get all overdue tasks
    getTasks: function(showLoading) {
        if (Prodea.App.ConnectedHealth.isAuth) {
            if (showLoading) { Prodea.UI.Loading.show(); }
            $.ajax({
                url: Prodea.App.ConnectedHealth.MinervaURL + "workflow/getTasksForCenter",
                type: "POST",
                headers: {
                    'api-info': Prodea.App.ConnectedHealth.MinervaApiInfo,
                    'x-auth-token': Prodea.App.ConnectedHealth.loginToken
                },
                contentType: "text/plain",
                data: '{assignedTo: \"taskCandidateOrAssigned\", sortDir: \"desc\"}',
                success: function(response){
                    Prodea.App.ConnectedHealth.Controls.dashboard.tasks(response.returnTasks);
                    Prodea.UI.Loading.hide();
                },
                statusCode: {
                    401: function() {
                        Prodea.UI.Loading.hide();
						Prodea.App.ConnectedHealth.connectionTimeout();
                        Prodea.UI.Dialog.Alert("Your connection has timmed out, please log in again");
                    },
                    404: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Tasks not found");
                    },
                    500: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Internal service error, please try again");
                    }
                },
            });
        } else {
            Prodea.App.ConnectedHealth.logout();
        }
    },

    // Converts MphRx's task priority code to text
    getPriority: function(priority) {
        switch (priority) {
            case 100:
                return 'high';
                break;
            case 50:
                return 'med';
                break;
            case 0:
                return 'low';
                break;
        }
    },

    // Upon clicking a task, get the task info and open the detail
    taskOnClickAction: function(id, index) {
        //STATS
        Prodea.WS.Stat({ stat: 'TaskDetailOpened', statValue: 1 });

        // get the task id from html value attribute and get details
        value = $('#'+id).val();
        if (Prodea.App.ConnectedHealth.isAuth) {
            Prodea.UI.Loading.show();
            $.ajax({
                url: Prodea.App.ConnectedHealth.MinervaURL + "workflow/getTask",
                type: "POST",
                headers: {
                    'api-info': Prodea.App.ConnectedHealth.MinervaApiInfo,
                    'x-auth-token': Prodea.App.ConnectedHealth.loginToken
                },
                contentType: "text/plain",
                data: '{taskId: \"' + value + '\"}',
                success: function(response){
                    // open the detail page
                    Prodea.App.ConnectedHealth.Controls.dashboard.displayTaskDetail(response)
                    Prodea.UI.Loading.hide();
                },
                statusCode: {
                    401: function() {
                        Prodea.UI.Loading.hide();
						Prodea.App.ConnectedHealth.connectionTimeout();
                        Prodea.UI.Dialog.Alert("Your connection has timmed out, please log in again");
                    },
                    404: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Tasks not found");
                    },
                    500: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Internal service error, please try again");
                    }
                },
            });
        } else {
            Prodea.App.ConnectedHealth.logout();
        }
    },

    // Gets the first reading for each vital available
    getVitals: function(showLoading) {
        if (Prodea.App.ConnectedHealth.isAuth) {
            if (showLoading) { Prodea.UI.Loading.show(); }
            allCodeLists = '\"' + Prodea.App.ConnectedHealth.codes.diastolic + '\", \"' + Prodea.App.ConnectedHealth.codes.systolic + '\", \"' + Prodea.App.ConnectedHealth.codes.heart_rate + '\", \"' + Prodea.App.ConnectedHealth.codes.weight + '\", \"' + Prodea.App.ConnectedHealth.codes.height + '\", \"' + Prodea.App.ConnectedHealth.codes.BMI + '\", \"' + Prodea.App.ConnectedHealth.codes.respiration_rate + '\", \"' + Prodea.App.ConnectedHealth.codes.temperature + '\", \"' + Prodea.App.ConnectedHealth.codes.after_meal + '\", \"' + Prodea.App.ConnectedHealth.codes.fasting + '\", \"' + Prodea.App.ConnectedHealth.codes.random + '\"';
            $.ajax({
                url: Prodea.App.ConnectedHealth.MinervaURL + "moObservation/getVitals",
                type: "POST",
                headers: {
                    'api-info': "V3|appVerson|deviceBrand|deviceModel|deviceScreenResolution|deviceOs|deviceOsVersion|deviceNetworkProvider|deviceNetworkType",
                    'x-auth-token': Prodea.App.ConnectedHealth.loginToken
                },
                contentType: "text/plain",
                data: '{codeList: ['+ allCodeLists +'], patientId: ' + Prodea.App.ConnectedHealth.user.patientId + ', _count: \"1\"}',
                success: function(response){
                    Prodea.App.ConnectedHealth.Controls.dashboard.readings({
                        systolic: response.result[Prodea.App.ConnectedHealth.codes.systolic]['0'],
                        diastolic: response.result[Prodea.App.ConnectedHealth.codes.diastolic]['0'],
                        after_meal: response.result[Prodea.App.ConnectedHealth.codes.after_meal]['0'],
                        fasting: response.result[Prodea.App.ConnectedHealth.codes.fasting]['0'],
                        random: response.result[Prodea.App.ConnectedHealth.codes.random]['0'],
                        respiration_rate: response.result[Prodea.App.ConnectedHealth.codes.respiration_rate]['0'],
                        BMI: response.result[Prodea.App.ConnectedHealth.codes.BMI]['0'],
                        heart_rate: response.result[Prodea.App.ConnectedHealth.codes.heart_rate]['0'],
                        temperature: response.result[Prodea.App.ConnectedHealth.codes.temperature]['0']
                    });

                    Prodea.App.ConnectedHealth.Controls.dashboard.displayAllVitals(
                        response.result[Prodea.App.ConnectedHealth.codes.systolic]['0'],
                        response.result[Prodea.App.ConnectedHealth.codes.diastolic]['0'],
                        response.result[Prodea.App.ConnectedHealth.codes.after_meal]['0'],
                        response.result[Prodea.App.ConnectedHealth.codes.fasting]['0'],
                        response.result[Prodea.App.ConnectedHealth.codes.random]['0'],
                        response.result[Prodea.App.ConnectedHealth.codes.respiration_rate]['0'],
                        response.result[Prodea.App.ConnectedHealth.codes.BMI]['0'],
                        response.result[Prodea.App.ConnectedHealth.codes.heart_rate]['0'],
                        response.result[Prodea.App.ConnectedHealth.codes.temperature]['0']
                    );

                    Prodea.UI.Loading.hide();
                },
                statusCode: {
                    401: function() {
                        Prodea.UI.Loading.hide();
						Prodea.App.ConnectedHealth.connectionTimeout();
                        Prodea.UI.Dialog.Alert("Your connection has timmed out, please log in again");
                    },
                    404: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Vitals not found");
                    },
                    500: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Internal service error, please try again");
                    }
                },
            });
        } else {
            Prodea.App.ConnectedHealth.logout();
        }
    },

    // display all the vital widgets on the dashboard
    // need to change this to work with Knockout JS (a lot going on maybe split into multiple observables?)
    displayAllVitals: function(systolic, diastolic, after_meal, fasting, random_glucose, respiration_rate, BMI, heart_rate, temperature){
        //Find which glucose reading came first if any
        blood_glucose = Prodea.App.ConnectedHealth.checkDates(after_meal, fasting);
        blood_glucose = Prodea.App.ConnectedHealth.checkDates(blood_glucose, random_glucose);

        if (systolic && diastolic) this.displayVital('.blood_pressure', systolic.value + '/' + diastolic.value, systolic.unit, systolic.date, systolic.referenceRange, systolic.value);
        if (blood_glucose) this.displayVital('.blood_glucose', blood_glucose.value, blood_glucose.unit, blood_glucose.date, blood_glucose.referenceRange, blood_glucose.value);
        if (respiration_rate) this.displayVital('.blood_oxygen', respiration_rate.value, respiration_rate.unit, respiration_rate.date, respiration_rate.referenceRange, respiration_rate.value);
        if (BMI) this.displayVital('.weight', BMI.value, BMI.unit, BMI.date, BMI.referenceRange, BMI.value);
        if (heart_rate) this.displayVital('.heart_rate', heart_rate.value, heart_rate.unit, heart_rate.date, heart_rate.referenceRange, heart_rate.value);
        if (temperature) this.displayVital('.temperature', temperature.value, temperature.unit, temperature.date, temperature.referenceRange, temperature.value);
    },

    // displays the given vital on the dashboard
    // valueString is different from valueForRange to accomodate vitals that include multiple values in their display e.g. blood pressure (systolic/diastolic)
    displayVital: function(vitalClass, valueString, unit, date, referenceRange, valueForRange){
        // preset rotation, rating, and strings to empty/no-data values
        rotation = null;
        rating = "n/a";
        gaugeClass = "no-range";
        infoHtml = "<h3>You don't have any readings for this vital yet!</h3>";
        gaugeHtml = "<div class=\"gauge no-value\"><img class=\"image\" src=\"../assets/images/Graph.png\"><div class=\"indicator\"><div class=\"arrow-border\"></div><div class=\"arrow\"></div></div><div class=\"data\"><h2>— —</h2><p class=\"unit\">— —</p></div></div>"
        
        //check for a value
        if (valueString) {
            
            //check for reference range
            if (referenceRange) {
                rotation = Prodea.App.ConnectedHealth.getRotation(valueForRange, referenceRange.high.value, referenceRange.low.value);
                rating = this.getRating(valueForRange, referenceRange.high.value, referenceRange.low.value);
                gaugeClass = "";
            }
    
            gaugeHtml = '<div class=\"gauge\ ' + gaugeClass + '"><img class=\"image\" src=\"../assets/images/Graph.png\"><div class=\"indicator\" style=\"-webkit-transform: rotate(' + rotation + 'deg)\"><div class=\"arrow-border\"></div><div class=\"arrow\"></div></div><div class=\"data\"><h2>' + valueString + '</h2><p class=\"unit\">' + unit + '</p></div></div>';
            infoHtml = '<h4>Last Reading</h4><h2 class=\"' + rating + ' caps\">' + rating + '</h2><h4>Date Taken</h4><h3>' + jQuery.timeago(date) + '</h3>';    
        }
        
        $(vitalClass + ' .gauge-box').html(gaugeHtml);
        $(vitalClass + ' .info-box').html(infoHtml);
    },

    // evaluates a value based on a range and returns a string rating
    getRating: function(value, high, low) {
        if ((value - low) < 0) {
            return "low";
        } else if ((value - high) > 0) {
            return "high";
        } else {
            return "normal";
        }
    },



    getUserDetails: function(showLoading) {
        if (Prodea.App.ConnectedHealth.isAuth) {
            if (showLoading) { Prodea.UI.Loading.show(); }
            $.ajax({
                url: Prodea.App.ConnectedHealth.MinervaURL + "Patient/show/" + Prodea.App.ConnectedHealth.user.patientId,
                type: "POST",
                headers: {
                    'api-info': Prodea.App.ConnectedHealth.MinervaApiInfo,
                    'x-auth-token': Prodea.App.ConnectedHealth.loginToken
                },
                contentType: "text/plain",
                data: "{userlanguage: en}",
                success: function(response){
                    if (response.careProvider.length) {
                        $('#care-providers div').html('');
                        $.each(response.careProvider, function(index, value) {
                            Prodea.App.ConnectedHealth.Controls.dashboard.getCareProviderDetails(value.ref, value.id);
                        });
                    } else {
                        $('#care-providers div').html('You don\'t have any care providers associated with your account</div>');
                    }
                    
                    Prodea.UI.Loading.hide();
                },
                statusCode: {
                    401: function() {
                        Prodea.UI.Loading.hide();
						Prodea.App.ConnectedHealth.connectionTimeout();
                        Prodea.UI.Dialog.Alert("Your connection has timmed out, please log in again");
                    },
                    404: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Patient not found");
                    },
                    500: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Internal service error, please try again");
                    }
                },
            });
        } else {
            Prodea.App.ConnectedHealth.logout();
        }
    },

    getCareProviderDetails: function(ref, id) {
        if (Prodea.App.ConnectedHealth.isAuth) {
            // Prodea.UI.Loading.show();
            $.ajax({
                url: ref,
                type: "POST",
                headers: {
                    'api-info': Prodea.App.ConnectedHealth.MinervaApiInfo,
                    'x-auth-token': Prodea.App.ConnectedHealth.loginToken
                },
                contentType: "text/plain",
                data: "{userlanguage: en}",
                context: Prodea.App.ConnectedHealth.Controls.dashboard,
                success: function(response){
                    // this.careProvidersObject[response.id] = response;

                    // var vals = Object.keys(this.careProvidersObject).map(function(key) {
                    //     return Prodea.App.ConnectedHealth.Controls.dashboard.careProvidersObject[key];
                    // });

                    // this.careProviders(vals);
                    // console.log('care provider:', response);
                    // console.log(this.careProvidersObject);
                    this.displayCareProviderDetails(response);
                    Prodea.UI.Loading.hide();
                },
                statusCode: {
                    401: function() {
                        Prodea.UI.Loading.hide();
						Prodea.App.ConnectedHealth.connectionTimeout();
                        Prodea.UI.Dialog.Alert("Your connection has timmed out, please log in again");
                    },
                    404: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Patient not found");
                    },
                    500: function() {
                        Prodea.UI.Loading.hide();
                        Prodea.UI.Dialog.Alert("Internal service error, please try again");
                    }
                },
            });
        } else {
            Prodea.App.ConnectedHealth.logout();
        }
    },

    createTableRow: function(title, value, type) {
        return '<tr><th>' + title + '</th><td class=\"' + type + '\">' + value + '</td></tr>';
    },

    //DO THIS STUFF WITH KNOCKOUT
    displayCareProviderDetails: function(careProvider) {
        careProviderHtml = '<table>';
        careProviderHtml += this.createTableRow('Name:', careProvider.name.text);

        phoneCount = 0;
        $.each(careProvider.telecom, function(index, value) {
            system = value.system;
            if (system == 'phone') {
                system = !phoneCount ? 'Phone:' : '';
                careProviderHtml += Prodea.App.ConnectedHealth.Controls.dashboard.createTableRow(system, value.value);
                phoneCount++;
            }
        });
        if (phoneCount == 0) {
            careProviderHtml += Prodea.App.ConnectedHealth.Controls.dashboard.createTableRow('Phone:', 'unavailable');
        }

        emailCount = 0;
        $.each(careProvider.telecom, function(index, value) {
            system = value.system;
            if (system == 'email') {
                system = !emailCount ? 'Email:' : '';
                careProviderHtml += Prodea.App.ConnectedHealth.Controls.dashboard.createTableRow(system, value.value, 'email');
                emailCount++;
            }
        });
        if (emailCount === 0) {
            careProviderHtml += Prodea.App.ConnectedHealth.Controls.dashboard.createTableRow('Email:', 'unavailable');
        }

        $('#care-providers div').append(careProviderHtml + '</table>')
    },

    displayTaskDetail: function(task) {
        overlayString = '<div class="content-box"><h2>' + task.name + '</h2><p>' + task.description + '</p><table>';
        overlayString += '<tr><th>Category: </th><td>' + task.category + '</td></tr>';
        // overlayString += '<tr><th>Status: </th><td>' + task.status + '</td></tr>';
        overlayString += '<tr><th>Priority: </th><td>' + this.getPriority(task.priority) + '</td></tr>';
        overlayString += '<tr><th>Due Date: </th><td>' + moment(task.dueDate).format('DD MMMM YYYY') + '</td></tr>';
        overlayString += '<tr><th>Assigned By: </th><td>' + task.ownerName.firstName + ' ' + task.ownerName.lastName + '</td></tr>';
        overlayString += '</table><button id="dismissTask" onClick="Prodea.App.ConnectedHealth.Controls.dashboard.hideTaskDetail()">Done</button></div>';
        Prodea.App.ConnectedHealth.showOverlay(overlayString, '#dismissTask', this.hideTaskDetail);
    },

    hideTaskDetail: function() {
        Prodea.App.ConnectedHealth.hideOverlay(function() {
            Prodea.Nav.focus('#task_slider > ul > li\[lastActive=true\]');
        });
    }
    
});
