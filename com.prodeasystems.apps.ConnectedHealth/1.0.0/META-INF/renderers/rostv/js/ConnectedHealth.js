/**
 * Application: ConnectedHealth
 *
 * File: ConnectedHealth.js
 */

//When the framework is ready, Prodea.js has completed its work, this event occurs.
$(document).on('Prodea.Events.Ready', function() {
    Prodea.App.ConnectedHealth.load();
});

Prodea.Application({
  name: 'ConnectedHealth',
  id: 'com.prodeasystems.apps.ConnectedHealth',
  version: '1.0.0',
  Development: false // When false, initialize_css.less is compiled to less, when true initialize.less is used.
});

Prodea.App.ConnectedHealth = {
    Controls: {},
    isLoaded: false,
    MinervaURL: "https://demominervaus.mphrx.com/minerva/",
    MinervaApiInfo: "V1|appVerson|deviceBrand|deviceModel|deviceScreenResolution|deviceOs|deviceOsVersion|deviceNetworkProvider|deviceNetworkType",
    loginToken: "",
    isAuth: false,
    user: null,
    userObservable: null,
    overlayBackPress: null,
    notificationCount: null,
    notificationInterval: null,

    codes: {
        diastolic: '8462-4',
        systolic: '8480-6',
        heart_rate: '8867-4',
        weight: '3141-9',
        height: '8302-2',
        BMI: '39156-5',
        respiration_rate: '9279-1',
        temperature: '8310-5',
        after_meal: '1521-4',
        fasting: '1558-6',
        random: '2345-7',
    },

    // Called above when "Prodea.Events.Ready" is triggered
    load: function() {
        $.when(
            //Download all required files
            Prodea.Loader.load([
                Prodea.Path.sdk + "common/VM.js",
				Prodea.Path.sdk + "rostv/components/keyboard/keyboard.js",
                Prodea.Path.sdk + "rostv/components/popupkeyboard/popupkeyboard.js",
                Prodea.Path.sdk + "rostv/components/grid/grid.js",
                Prodea.Path.sdk + "rostv/components/shortcutbar/shortcutbar.js",
                Prodea.Path.sdk + 'common/components/radiobutton/radiobutton.js',
                Prodea.Path.thirdparty + "knockout/knockout-3.0.0.js",
            ])
        )
        .done( $.proxy( function() {
            //Init VM module and stateHandler
            Prodea.VM.Initialize(this, {visibilityDuration: 333});        
            this.stateHandler.init();
            this.userObservable = ko.observable();
            this.notificationCount = ko.observable();
        }, this))
        .fail( function() {
            Prodea._errorLoading({message: 'Prodea.App.connectedHealthTestApp :: Failed to load all required files'});            
        } );
    },

    loaded: function() {
        if (this.isLoaded) {
            return;
        }
        this.isLoaded = true;

        this.hideOverlay();

        Prodea.WS.Log.info("ConnectedHealth Loaded Successfully");
        Prodea.WS.Stat([
            { stat: 'SuccessfulInvocations', statValue: 1 },
            { stat: 'SummarySuccess', statValue: 1 }]
        );

        setInterval( function () { Prodea.WS.Stat({ stat: 'MinutesVisible', statValue: 1 }); }, 60 * 1000);

        Prodea.PostMessage.loaded();
    },

    stateHandler: {
        //TODO: Might have to change with login flow...
        activeControl: 'login',
        controls: null,
        parent: null,

        init: function() {
            this.parent = Prodea.App.ConnectedHealth;
            this.controls = this.parent.Controls;

            Prodea.UI.Loading.show();

            $.when(
                //create the nav menu
                Prodea.UI.AppMenu.showMenu({
                    name: 'ConnectedHealth',
                    //back to main menu
                    navLeftAction: function() {
                        Prodea.PostMessage.send('ShowLaunchpad');
                    },
                    navRightAction: $.proxy( function() {
                        this.parent.Controls[ this.activeControl ].focus();
                    }, this),
                    //menu items
                    items: [
                        {
                            id: 'dashboard', text: '<img class="menu-icon" src="../assets/images/Icons/Color/Home.svg"><span class="menu-text">Dashboard</span>',
                            callback: $.proxy(function(){ this.loadControl('dashboard'); }, this)
                        },
                        {
                            id: 'vitals', text: '<img class="menu-icon" src="../assets/images/Icons/Color/Vitals.svg"><span class="menu-text">Vitals</span>', hasSubMenu: true,
                            callback: $.proxy(function(){ this.vitalsOnClickAction() }, this)
                        },
                        {
                            id: 'help', text: '<img class="menu-icon" src="../assets/images/Icons/Color/Help.svg"><span class="menu-text">Help</span>',
                            callback: $.proxy(function(){ this.loadControl('help'); }, this)
                        },
                        {
                            id: 'about', text: '<img class="menu-icon" src="../assets/images/Icons/Color/About.svg"><span class="menu-text">About</span>',
                            callback: $.proxy(function(){ this.loadControl('about'); }, this)
                        },
                        {
                            id: 'settings', text: '<img class="menu-icon" src="../assets/images/Icons/Color/Settings.svg"><span class="menu-text">Settings</span>',
                            callback: $.proxy(function(){ this.loadControl('settings'); }, this)
                        }

                    ]
                })
            )
            .done($.proxy(function(){
                Prodea.UI.AppMenu.shiftTo(0, true);
                Prodea.VM.Create('login', '[data-id="login"]');
                
                Prodea.UI.Loading.hide();

            }, this))
            .fail(function(){
                Prodea.WS.Log.error("App menus failed to initialize.");
            });
        },


        // Opens the submenu for the vitals
        vitalsOnClickAction: function(view) {
            indexes = {
                'blood_pressure': 0,
                'blood_glucose': 1,
                'blood_oxygen': 2,
                'weight': 3,
                'heart_rate': 4,
                'temperature': 5
            }
            // Since this is a submenu, not an initial creation of the menu component, the deferred is NOT required
            Prodea.UI.AppMenu.showMenu({
                name: "Vitals",
                navLeftAction: function() { 
                    Prodea.UI.AppMenu.back();
                    Prodea.UI.AppMenu.focus();
                },
                navRightAction: $.proxy( function() { 
                    this.parent.Controls[ this.activeControl ].focus(); 
                }, this),
                items: [
                    {
                        id: 'blood_pressure', text: '<img class="menu-icon" src="../assets/images/Icons/Color/Blood_Pressure.svg"><span class="menu-text submenu">Blood Pressure</span>',
                        callback: $.proxy(function(){ this.loadControl('blood_pressure'); }, this)
                    },
                    {
                        id: 'blood_glucose', text: '<img class="menu-icon" src="../assets/images/Icons/Color/Glucose.svg"><span class="menu-text submenu">Blood Glucose</span>',
                        callback: $.proxy(function(){ this.loadControl('blood_glucose'); }, this)
                    },
                    {
                        id: 'blood_oxygen', text: '<img class="menu-icon" src="../assets/images/Icons/Color/Oxygen.svg"><span class="menu-text submenu">Respiration Rate</span>',
                        callback: $.proxy(function(){ this.loadControl('blood_oxygen'); }, this)
                    },
                    {
                        id: 'weight', text: '<img class="menu-icon" src="../assets/images/Icons/Color/Scale.svg"><span class="menu-text submenu">BMI</span>',
                        callback: $.proxy(function(){ this.loadControl('weight'); }, this)
                    },
                    {
                        id: 'heart_rate', text: '<img class="menu-icon" src="../assets/images/Icons/Color/Heart_Rate.svg"><span class="menu-text submenu">Heart Rate</span>',
                        callback: $.proxy(function(){ this.loadControl('heart_rate'); }, this)
                    },
                    {
                        id: 'temperature', text: '<img class="menu-icon" src="../assets/images/Icons/Color/Temperature.svg"><span class="menu-text submenu">Temperature</span>',
                        callback: $.proxy(function(){ this.loadControl('temperature'); }, this)
                    }

                ]
            });

            if (view) {
                Prodea.UI.AppMenu.setCurrent(indexes[view]);
                this.loadControl(view); 
            } else {
                // show current selection on the starting view menu entry -- this sets the slight grey background color on the row
                Prodea.UI.AppMenu.setCurrent(0);
            
                // Show our starting view
                this.loadControl("blood_pressure"); 
            }
                     

        },

        loadControl: function(control){
            /**
             * This function is doing several things to make our life easier
             * The primary job of this is to load controls and perform standard functions, such as binding a keypress
             *
             * The rest of the logic here stores the current control and ensures that the introduction control is never destroyed, but rather shown/hidden.
             * This is extremely useful for some applications (not so much this one) as a way to 'cache' the initial or primary control in your application
             * when it is a 'heavy' control in terms of initialization load or filesize. Since all controls are lazy loaded and initialized, showing how to
             * take advantage of this feature of Prodea.VM should be useful. This is NOT provided as required functionality or a template, but a real world
             * use-case example of mixing dynamic (created an destroyed on demand) controls and "permanent" controls
             *
             * The smallest use of Prodea.VM would simply be calling .Destroy() and .Create() -- nothing more or less. The Deferred around .Create() is not even required.
             */

             if (this.activeControl === control){
                 this.controls[ this.activeControl ].focus();
                 return;
             }

             if (this.activeControl !== 'login'){
                 Prodea.VM.Destroy(this.activeControl, false);
             } else if (this.activeControl === 'login') {
                 this.controls.login.hide();
             }

            // Prodea.VM.Destroy(this.activeControl, false);

             this.activeControl = control;

             if (control === "login"){
                 this.controls.login.show();
             } else {
                 $.when(
                     Prodea.VM.Create(control, '[data-id="' + control + '"]', {createNewDiv: true})
                 )
                 .done($.proxy( function(){
                     this.controls[ this.activeControl ].bindKeypress('BACK', function(){
                         if (!Prodea.UI.AppMenu.hasFocus){
                             Prodea.UI.AppMenu.focus();
                         } else if (Prodea.UI.AppMenu.currentSubMenu !== 0) {
                             Prodea.UI.AppMenu.back();
                             Prodea.UI.AppMenu.focus();
                         } else {
                             Prodea.PostMessage.send("ShowLaunchpad");
                         }
                     });
                 }, this))
                 .fail($.proxy(function(){
                     this.activeControl = 'login';
                     this.controls.login.show();
                     Prodea.UI.Dialog.Alert("Error loading control :: " + control);
                 }, this));
             }

            // $.when(
            //     Prodea.VM.Create(control, '[data-id="' + control + '"]', {createNewDiv: true})
            // )
            // .done($.proxy( function(){
            //     this.controls[ this.activeControl ].bindKeypress('BACK', function(){
            //         if (!Prodea.UI.AppMenu.hasFocus){
            //             Prodea.UI.AppMenu.focus();
            //         } else if (Prodea.UI.AppMenu.currentSubMenu !== 0) {
            //             Prodea.UI.AppMenu.back();
            //             Prodea.UI.AppMenu.focus();
            //         } else {
            //             Prodea.PostMessage.send("ShowLaunchpad");
            //         }
            //     });
            // }, this))
            // .fail($.proxy(function(){
            //     this.activeControl = 'login';
            //     this.controls.login.show();
            //     Prodea.UI.Dialog.Alert("Error loading control :: " + control);
            // }, this));
        }
    },

    // FUNCTIONS USED ACROSS MULTIPLE JS FILES

    // Shows custom overlay used for task/readings details
    // closeFunction allows user to pass in a function to allow for refocusing when using back button to close
    showOverlay: function(htmlString, idToFocus, closeFunction) {
        // fill overlay with given html string then show
        $('#DASHOVERLAY .overlay-content').html(htmlString);
        $('#DASHOVERLAY').show();

        // blur background content (might remove)
        $('#blur').css({
            "-webkit-filter": "blur(3px)",
            "-moz-filter": "blur(3px)",
            "-o-filter": "blur(3px)",
            "-ms-filter": "blur(3px)",
            "filter": "blur(3px)"
        });

        // pass and id within to focus on
        if(idToFocus) {
            Prodea.Nav.focus(idToFocus);
        }

        // disable back button and change to dissmiss the overlay with optional callback
        this.overlayBackPress = this.stateHandler.controls[ this.stateHandler.activeControl ].bindKeypress('BACK', $.proxy(function () {
			if (closeFunction) closeFunction();
        }, this));
        
    },

    //Hides cutstom overlay
    hideOverlay: function(callback) {
        // hide and remove content
        $('#DASHOVERLAY').hide();
        $('#DASHOVERLAY .overlay-content').html('');
        
        // unblur background content
        $('#blur').css({
            "-webkit-filter": "none",
            "-moz-filter": "none",
            "-o-filter": "none",
            "-ms-filter": "none",
            "filter": "none"
        });

        // unbind the dismiss overlay keypress
        Prodea.Keys.off(this.overlayBackPress, Prodea.Keys.BACK);
        if (callback) callback();
    },

    // Logs user out, optional menuBack is to retun menu to normal if logging out (from timout or other error) from submenu page
    logout: function(menuBack) {
        clearInterval(Prodea.App.ConnectedHealth.notificationInterval);
        this.isAuth = false;
        this.loginToken = "";
        this.user = null;
        if (menuBack) {
            Prodea.UI.AppMenu.back();
            Prodea.UI.AppMenu.focus();
        }
        this.stateHandler.loadControl('login');
        
        //STATS
        Prodea.WS.Stat({ stat: 'UserLogout', statValue: 1 });
    },
    
    // Displays alert and then logs out on connection timeout, optional menuBack is to retun menu to normal if logging out (from timout or other error) from submenu page
    connectionTimeout: function(menuBack) {
        Prodea.UI.Dialog.Alert("Your connection has timmed out, please log in again", "Error", $.proxy(function(){ Prodea.App.ConnectedHealth.logout(menuBack); }, this));
    },

    // Get User Details after login
    getUser: function() {
        if (this.isAuth) {
            Prodea.UI.Loading.show();
            $.ajax({
                url: this.MinervaURL + "moUser/getUserDetails",
                type: "POST",
                headers: {
                    'api-info': this.MinervaApiInfo,
                    'x-auth-token': this.loginToken
                },
                contentType: "text/plain",
                data: "{userlanguage: en}",
                context: this,
                success: function(response){
                    this.userObservable(response);
                    this.user = response;
                    this.continueToDashboard();                
                    // $( document ).trigger( "userLoadedEvent");
                    Prodea.UI.Loading.hide();
                },
                error: function(error) {
                    Prodea.UI.Loading.hide();
                    error_message = error.responseJSON.msg;
                    Prodea.WS.Log.trace(error);
                    Prodea.UI.Dialog.Alert(error_message);
                }
            });
        } else {
            this.logout();
        }
    },

    //Called after getUser returns after login
    continueToDashboard: function() {
        this.keepAlive();
        $("#MenuBar").show();
        this.stateHandler.loadControl('dashboard');
    },
    
    // returns ISO string date range starting from the begining of the date range 1, 7 or 30, to the end of today
	getDateRange: function(numDays) {
		range = {
			startDate: moment().subtract(numDays, 'days').toISOString(),
			endDate: moment().toISOString()
        }
		return range;
    },

    //Check dates against eachother
    checkDates: function(first, second) {
        if (!first && !second) return null;
        if (first && !second) return first;
        if (!first && second) return second;
        return (moment(first).isAfter(second) ? first : second);
    },

    // returns the degree rotation for the guage arrow
    getRotation: function(value, high, low) {
        return Math.min(144, Math.max(-144, Math.round((180*(value - low)/(high - low)) - 90)));
    },
    
    // Returns the average value of a given set of readings
    getAverageOfReadings: function(readings) {
        total = 0;
        $.each(readings, function(index, value){
            total += parseFloat(value.value);
        });

        return Math.round(total / readings.length);
    },

    // Returns an easily usable object for displaying an average of readings
    // Returns: avg value, unit, gaugeClass: class for guage (i.e. no-data, no-range, etc), rotation of indicatior, and numDays
    getAverage: function(readings, numDays) {
        average = this.getAverageOfReadings(readings);
		unit = "— —";
		referenceRange = null;
		rotation = 0;
		gaugeClass = "no-value";

		if (average) {
			value = average;
			unit = readings[0].unit;
			gaugeClass = "no-range"
			referenceRange = readings[0].referenceRange;

			if (referenceRange) {
				rotation = this.getRotation(average, referenceRange.high.value, referenceRange.low.value);
				gaugeClass = ""
			}
        }

		return {
			value: average,
			unit: unit,
			gaugeClass: gaugeClass,
			rotation: rotation,
			numDays: numDays
		};
    },

    keepAliveRequest: function() {
        if (Prodea.App.ConnectedHealth.isAuth) {
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
                    
                },
                error: function(error) {
                    Prodea.WS.Log.trace(error);
                }
            });
        } else {
            Prodea.App.ConnectedHealth.logout();
        }
    },

    keepAlive: function() {
        this.notificationInterval = setInterval(Prodea.App.ConnectedHealth.keepAliveRequest, 5*60*1000);
    }

};

