// Extend from VM as this is a particular application view.
Prodea.App.ConnectedHealth.Controls.help = $.extend( new Prodea.VM.Base(), {
    helpSliderUI: null,
    sliderFilled: false,
    faqs: ko.observableArray([]),

    init: function() {

        this.helpSliderUI = Prodea.UI.Slider('help_slider', 'Prodea.App.ConnectedHealth.Controls.help.helpSliderUI', {
			direction: 'V',
			shiftCallback: 'Prodea.App.ConnectedHealth.Controls.help.onShift',
			clickCallback: 'Prodea.App.ConnectedHealth.Controls.help.onClick',
			wrap: true,
			selectedIndex: 0,
			focusNavigation: {up: null, down: null, left: null, right: null},
            focusAction: {up: null, down: null, left: "Prodea.UI.AppMenu.focus();", right: null},
			animate: true,
            speed: 200,
			dmaScroll: false
        });
        
        this.faqs.subscribe(function() {
            Prodea.App.ConnectedHealth.Controls.help.helpSliderUI.init();
            Prodea.App.ConnectedHealth.Controls.help.helpSliderUI.shiftTo( Prodea.App.ConnectedHealth.Controls.help.helpSliderUI.active );
            Prodea.App.ConnectedHealth.Controls.help.sliderFilled = true;
        });
         

        // Trigger this 'out of sync', and only call this when the initial view is complete.
        setTimeout( $.proxy( function() { this.parent.loaded(); }, this), 1 ); 

        // this.updateFAQs();
        this.getFAQs();

        //STATS
        Prodea.WS.Stat({ stat: 'HelpPageViews', statValue: 1});
		this.minutesVisible = setInterval( function () { Prodea.WS.Stat({ stat: 'MinutesVisibleHelp', statValue: 1 }); }, 60 * 1000);
    },

    onShift: function(oldId, id) {    
        Prodea.WS.Log.trace("slider shift :: oldId = '"+oldId+"', id = '"+id+"'");    
    },
    
    onClick: function(id, idx) {    
        Prodea.WS.Log.trace("slider click :: id = '"+id+"', idx = '"+idx+"'");    
    },

    _focus: function() {
        if(this.sliderFilled) {
            this.helpSliderUI.shiftTo( this.helpSliderUI.active );
        }
        Prodea.UI.AppMenu.blur();
    },

    cleanUp: function() {
        clearInterval(Prodea.App.ConnectedHealth.Controls.help.minutesVisible);
    },

    updateFAQs: function() {
        faqs = [
            {
                question: 'Why aren\'t my measurements showing up?',
                answer: 'In order for your bluetooth devices to transfer readings, they must be within 10 feet of your bluetooth receiver (located on the ROS box).  Try taking your measurements closer to your ROS box, and if problems persist, call your care provider for assistance.'
            },
            {
                question: 'I\'m out of lancets/strips for my glucometer, how do I order more?',
                answer: 'To order more lancets or strips for your glucometer, please contact one of your care providers.  They will provide you with any materials you may require!'
            },
            {
                question: 'One of my readings seems inaccurate.  How can I remove it?',
                answer: 'Please contact your care provider with any concerns you have regarding individual readings and their validity.'
            },
            {
                question: 'Can I use a different brand of bluetooth device?',
                answer: 'Right now, the devices provided to you are the only devices currently supported, but we\'re working on integrating more in the future!'
            },
            {
                question: 'One of my readings seems inaccurate.  How can I remove it?',
                answer: 'Please contact your care provider with any concerns you have regarding individual readings and their validity.'
            },
            {
                question: 'Can I use a different brand of bluetooth device?',
                answer: 'Right now, the devices provided to you are the only devices currently supported, but we\'re working on integrating more in the future!'
            },   
        ]

        faqsString = JSON.stringify(faqs)

        $.when(
            Prodea.WS.CURL({type: 'POST', dataType: 'text', url: Prodea.Path.root + "ws/v3/prodea/persistence/storage/com.prodeasystems.apps.ConnectedHealth/1.0.0?key=faqs&value="+faqsString})
        ).done($.proxy(function (response) {
            Prodea.WS.Log.trace('response: ', response);
        }, this))
        .fail($.proxy(function (error) {
            Prodea.WS.Log.trace('error: ', error);
        }, this));

    },

    getFAQs: function() {
        $.when(
            Prodea.WS.CURL({type: 'GET', dataType: 'text', url: Prodea.Path.root + "ws/v3/prodea/persistence/storage/com.prodeasystems.apps.ConnectedHealth/1.0.0?key=faqs"})
        ).done($.proxy(function (response) {
            questions = JSON.parse($($.parseXML(response))[0].children[0].textContent);
            Prodea.WS.Log.trace('response: ', response);
            Prodea.App.ConnectedHealth.Controls.help.faqs(questions);
        }, this))
        .fail($.proxy(function (error) {
            Prodea.WS.Log.trace('error: ', error);
        }, this));
    }
    
});
