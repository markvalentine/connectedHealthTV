// Extend from VM as this is a particular application view.
Prodea.App.ConnectedHealth.Controls.login = $.extend( new Prodea.VM.Base(), {

    init: function() {

        

        // Trigger this 'out of sync', and only call this when the initial view is complete.
        setTimeout( $.proxy( function() { this.parent.loaded(); }, this), 1 );

        Prodea.UI.PopupKeyboard.init();
        // Prodea.UI.PopupKeyboard.bindKeyboards();

        $("#submit").click(function(){
            Prodea.App.ConnectedHealth.Controls.login.login($("#username").val(), $("#password").val());
        });
        
        $("#forgotPassword").click(function(){
            Prodea.App.ConnectedHealth.Controls.login.forgotPassword($("#username").val());
        });

        //STATS
        Prodea.WS.Stat({ stat: 'LoginPageViews', statValue: 1});
		this.minutesVisible = setInterval( function () { Prodea.WS.Stat({ stat: 'MinutesVisibleLogin', statValue: 1 }); }, 60 * 1000);
    },

    _focus: function() {
        $("#MenuBar").hide();
        Prodea.UI.AppMenu.blur();
        Prodea.Nav.focus("#username");
        // Prodea.Nav.focus("#profile-0");
    },

    cleanUp: function() {
        clearInterval(Prodea.App.ConnectedHealth.Controls.login.minutesVisible);
    },

    login: function(username, password) {
        Prodea.UI.Loading.show();
        $.ajax({
            url: Prodea.App.ConnectedHealth.MinervaURL + "api/login",
            type: "POST",
            contentType: "text/plain",
            data: "{username: " + username + ", password: " + password + "}",
            success: function(response){
                Prodea.App.ConnectedHealth.loginToken = response.token;
                Prodea.App.ConnectedHealth.isAuth = true;
                //Show the menu!
                Prodea.UI.AppMenu.shiftTo(0);
                Prodea.App.ConnectedHealth.getUser();
                Prodea.UI.Loading.hide();

                //STATS
                Prodea.WS.Stat({ stat: 'UserLogin', statValue: 1 });
            },
            error: function(error) {
                Prodea.UI.Loading.hide();
                error_message = error.responseJSON.msg;
                switch (error.responseJSON.status) {
                    case "L01":
                        error_message = "Invalid username or password";
                        break;
                    case "UV15":
                        error_message = "Your account has been blocked due to too many invalid login attempts";
                        break;
                    case "401":
                        error_message = "Invalid username";
                        break;
                }
                Prodea.WS.Log.trace(error);
                Prodea.UI.Dialog.Alert(error_message);
            }
        });
    },

    forgotPassword: function(username) {
        Prodea.WS.Stat({ stat: 'ForgotPassword', statValue: 1});
        if (username) {
            Prodea.UI.Loading.show();
            $.ajax({
                url: Prodea.App.ConnectedHealth.MinervaURL + "user/forgotPassword",
                type: "POST",
                contentType: "text/plain",
                data: '{username: \"' + username + '\", baseURL: \"https://demominervaus.mphrx.com/webconnect/#\"',
                success: function(response){
                    Prodea.UI.Loading.hide();
                    Prodea.UI.Dialog.Alert("Please check your email to proceed");
                },
                error: function(error) {
                    Prodea.UI.Loading.hide();
                    Prodea.WS.Log.trace(error);
                    Prodea.UI.Dialog.Alert(error.responseJSON.msg);
                }
            });

            Prodea.UI.Loading.hide();
            Prodea.UI.Dialog.Alert("Please check your email to proceed");
        } else {
            Prodea.UI.Dialog.Alert("No username detected. Please type your username into the login field to recover your password.");
        }
    },
    
});