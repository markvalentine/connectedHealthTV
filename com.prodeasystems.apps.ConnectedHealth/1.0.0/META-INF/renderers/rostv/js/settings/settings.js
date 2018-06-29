// Extend from VM as this is a particular application view.
Prodea.App.ConnectedHealth.Controls.settings = $.extend( new Prodea.VM.Base(), {

    userDetails: null,

    init: function() {

        // Trigger this 'out of sync', and only call this when the initial view is complete.
        setTimeout( $.proxy( function() { this.parent.loaded(); }, this), 1 );

        $("#logout").click(function(){
            Prodea.App.ConnectedHealth.logout();
        });

        this.getUserDetails();

        //STATS
        Prodea.WS.Stat({ stat: 'SettingsPageViews', statValue: 1});
		this.minutesVisible = setInterval( function () { Prodea.WS.Stat({ stat: 'MinutesVisibleSettings', statValue: 1 }); }, 60 * 1000);
    },

    _focus: function() {
        Prodea.Nav.focus("#logout");
        Prodea.UI.AppMenu.blur();
    },

    cleanUp: function() {
        clearInterval(Prodea.App.ConnectedHealth.Controls.settings.minutesVisible);
    },

    getUserDetails: function() {
        if (Prodea.App.ConnectedHealth.isAuth) {
            Prodea.UI.Loading.show();
            $.ajax({
                url: Prodea.App.ConnectedHealth.MinervaURL + "Patient/show/" + Prodea.App.ConnectedHealth.user.patientId,
                type: "POST",
                headers: {
                    'api-info': Prodea.App.ConnectedHealth.MinervaApiInfo,
                    'x-auth-token': Prodea.App.ConnectedHealth.loginToken
                    // 'x-auth-token': '89kdvmcnpvd6n0si8c7f712b05rseu92'
                },
                contentType: "text/plain",
                data: "{userlanguage: en}",
                success: function(response){
                    this.userDetails = response;
                    Prodea.App.ConnectedHealth.Controls.settings.displayUserDetails(response);
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

    displayUserDetails: function(results) {
        userDetailsHtml = ""

        userDetailsHtml += this.createTableRow('Name:', Prodea.App.ConnectedHealth.user.firstName.toLowerCase() + ' ' + Prodea.App.ConnectedHealth.user.lastName.toLowerCase());
        userDetailsHtml += this.createTableRow('Born:', moment(Prodea.App.ConnectedHealth.user.dob).format('D MMMM YYYY'));
        userDetailsHtml += this.createTableRow('Gender:', Prodea.App.ConnectedHealth.user.gender);

        phoneCount = 0;
        $.each(results.telecom, function(index, value) {
            system = value.system;
            if (system == 'phone') {
                system = !phoneCount ? 'Phone:' : '';
                userDetailsHtml += Prodea.App.ConnectedHealth.Controls.settings.createTableRow(system, value.value);
                phoneCount++;
            }
        });

        emailCount = 0;
        $.each(results.telecom, function(index, value) {
            system = value.system;
            if (system == 'email') {
                system = !emailCount ? 'Email:' : '';
                userDetailsHtml += Prodea.App.ConnectedHealth.Controls.settings.createTableRow(system, value.value, 'email');
                emailCount++;
            }
        });

        $('#user-details table').html(userDetailsHtml)
    },
    
});
