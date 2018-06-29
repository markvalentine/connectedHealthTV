// Extend from VM as this is a particular application view.
Prodea.App.ConnectedHealth.Controls.about = $.extend( new Prodea.VM.Base(), {
    aboutSliderUI: null,

    init: function() {

        this.aboutSliderUI = Prodea.UI.Slider('about_slider', 'Prodea.App.ConnectedHealth.Controls.about.aboutSliderUI', {
			direction: 'V',
			shiftCallback: 'Prodea.App.ConnectedHealth.Controls.about.onShift',
			clickCallback: 'Prodea.App.ConnectedHealth.Controls.about.onClick',
			wrap: true,
			selectedIndex: 0,
			focusNavigation: {up: null, down: null, left: null, right: null},
            focusAction: {up: null, down: null, left: "Prodea.UI.AppMenu.focus();", right: null},
			animate: true,
            speed: 200,
			dmaScroll: false
        });
        
        this.aboutSliderUI.init();
         

        // // Trigger this 'out of sync', and only call this when the initial view is complete.
        setTimeout( $.proxy( function() { this.parent.loaded(); }, this), 1 ); 

        //STATS
        Prodea.WS.Stat({ stat: 'AboutPageViews', statValue: 1});
		this.minutesVisible = setInterval( function () { Prodea.WS.Stat({ stat: 'MinutesVisibleAbout', statValue: 1 }); }, 60 * 1000);
    },

    onShift: function(oldId, id) {    
        Prodea.WS.Log.trace("slider shift :: oldId = '"+oldId+"', id = '"+id+"'");    
    },
    
    onClick: function(id, idx) {    
        Prodea.WS.Log.trace("slider click :: id = '"+id+"', idx = '"+idx+"'");    
    },

    _focus: function() {
        this.aboutSliderUI.shiftTo( this.aboutSliderUI.active );
        Prodea.UI.AppMenu.blur();
    },

    cleanUp: function() {
        clearInterval(Prodea.App.ConnectedHealth.Controls.about.minutesVisible);
    }
    
});
