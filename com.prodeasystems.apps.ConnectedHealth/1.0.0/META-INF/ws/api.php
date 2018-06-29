<?php

//==============================================================================
//
// $Header:  $
//
// -----------------------------------------------------------------------------
//  (c)COPYRIGHT 2006-2017 PRODEA SYSTEMS, INC. ALL RIGHTS RESERVED.
//  PRODEA SYSTEMS CONFIDENTIAL INFORMATION AND TRADE SECRETS
//  THE SOURCE CODE CONTAINED IN THIS FILE IS THE PROPERTY OF PRODEA
//  SYSTEMS, INC. ("PRODEA"), AND CONSTITUTES TRADE SECRETS OF PRODEA
//  SYSTEMS, INC. THE HOLDER OF THIS FILE MUST KEEP THIS FILE AND ALL
//  ITS CONTENTS STRICTLY CONFIDENTIAL AND IS GRANTED NO RIGHTS TO USE
//  THE SOURCE CODE EXCEPT TO THE EXTENT EXPRESSLY AUTHORIZED BY PRODEA.
//  IF YOU ARE NOT AUTHORIZED TO POSSESS THIS SOURCE CODE, YOU MUST
//  RETURN IT TO PRODEA IMMEDIATELY UPON RECEIPT OR, IF YOU HOLD
//  IT IN A FORM THAT CANNOT BE RETURNED, YOU MUST DESTROY IT. IF YOU
//  FAIL TO DO SO PROMPTLY, YOU MAY FACE LEGAL ACTION FOR THEFT AND
//  MISAPPROPRIATION OF TRADE SECRETS.
// -----------------------------------------------------------------------------
//
//  $Author: $
//  $Revision:  $
//
//==============================================================================

if (!class_exists('com_prodeasystems_apps_ConnectedHealth_1_0_0_apiNAPI'))
{
   class com_prodeasystems_apps_ConnectedHealth_1_0_0_apiNAPI
   {

      private $resources;

      const APP_SYMBOLIC_NAME = 'com.prodeasystems.apps.ConnectedHealth';
      const APP_BUNDLE_VERSION = '1.0.0';
      const APP_WS_ROOT_PATH ='/^\/ws\/apps\/com.prodeasystems.apps.ConnectedHealth\/1.0.0\/api';

      public function __construct()
      {
         // set up resource expressions

         // GET ws/apps/com.prodeasystems.apps.ConnectedHealth/1.0.0/api/example
         $this->resources['get'][$this::APP_WS_ROOT_PATH . '\/example[\/]?$/']
                                 = array(  'fn'          => 'serveGetExample',
                                           'name'        => 'example',
                                           'usage'       => '',
                                           'description' => 'Example web service, returning back success response');

         // GET ws/apps/com.prodeasystems.apps.ConnectedHealth/1.0.0/api
         $this->resources['get'][$this::APP_WS_ROOT_PATH .'[\/]?$/'] = array('fn' => 'usage');

         // GET ws/apps/com.prodeasystems.apps.ConnectedHealth/1.0.0/api/usage
         $this->resources['get'][$this::APP_WS_ROOT_PATH .'\/usage[\/]?$/'] = array('fn' => 'usage');

      }

      //===========================================================================
      // Main Serve
      //===========================================================================

      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      public function serve()
      {
         $method = strtolower($_SERVER['REQUEST_METHOD']);
         if( ($method == "get")  || ($method == "post") ) {
             foreach ($this->resources[$method] as $expr => $details){
                 $fn = $details['fn'];
                 if(preg_match($expr,$_SERVER['SCRIPT_NAME'])) {
                     $rsrc = explode('/',$_SERVER['SCRIPT_NAME']);
                     if($rsrc[0]=="") array_shift($rsrc);
                     $this->$fn($rsrc);
                     return;
                 }
             }
             header("Not Found", 1, 404);
             syslog(LOG_WARNING, "Launchpad WS: Invalid $method request at " . $_SERVER['SCRIPT_NAME']);
             return;
         }
         header("Method Not Allowed", 1, 405);
         header("Accept: GET, POST", 1);
         syslog(LOG_WARNING, "Launchpad WS: Invalid request method: $method");
         return;
      }

      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      private function usage($rsrc)
      {
         $root = '/ws/apps/'. $this::APP_SYMBOLIC_NAME . '/' . $this::APP_BUNDLE_VERSION .'/api';
         reportUsage($root, $this->resources);
      }

      //===========================================================================
      //  Serve Functions
      //===========================================================================

      public function serveGetExample() {
         header("content-type:text/xml;charset=utf-8", 1);
         echo '<?xml version="1.0" encoding="UTF-8"?>';
         echo  '<results>';
         echo  '</results>';
      }
   };


}

$napi = new com_prodeasystems_apps_ConnectedHealth_1_0_0_apiNAPI();
$rsrc = $napi->serve();

?>
