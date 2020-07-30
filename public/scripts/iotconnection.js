function loadJSON(callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', '/mqtt_creds', true); 
    xobj.onreadystatechange = function () {
                if (xobj.readyState == 4 && xobj.status == "200") {
                    // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
                    // return xobj.responseText
                    callback(xobj.responseText);
                }
    };
    xobj.send(null);
}

loadJSON(function(response) {
  // Parse JSON string into object
    console.log("Loading MQTT credentials")
initMQTTClient(JSON.parse(response))
})

var initMQTTClient = function(Creds) {
   var watson_channel = 'iot-2/type/' + Creds.IOT_DEVICE_TYPE + '/id/' + Creds.IOT_DEVICE_ID + '/evt/'+  Creds.IOT_EVENT_TYPE + '/fmt/json'
   var cleanSession = true;
   var subscribeOptions = {
       onSuccess: function() {
           console.log("subscription set");
           const map = new HereMap(Creds.HERE_APP_ID, Creds.HERE_APP_KEY, document.getElementById("mapContainer"),null);
           //const map = new HereMap("21qr4uc02EjXeVpPDQZ6","CpIOV1zoDg8FQ3vJVoJv4TjPl8CnDJVc_7soRyrNkHM", document.getElementById("mapContainer"));
           //map.loadGeoJson('/data/ChennaiZones.geojson');
           //console.log('map: ',map);
           var quarantineIds = [];
           mqttClient.onMessageArrived = function (messageObj) {
               //var message = JSON.parse(messageObj.payloadString).d
               var message = JSON.parse(messageObj.payloadString);
               var node_id = message['node_id'];
               if(quarantineIds.indexOf(node_id) === -1) {
                map.initTrackableQuarantine(message);
                quarantineIds.push(node_id);
               }else{
                map.updateTrackableQuarantine(message);
               }
               map.renderList();               
           }
       }
   }
 var options = {
 timeout: 40,
 cleanSession: cleanSession,
 useSSL: false,
 userName: Creds.IOT_API_KEY,
 password: Creds.IOT_AUTH_TOKEN,
       onSuccess: function () {
           console.log("mqtt client connected")
           mqttClient.subscribe( watson_channel, subscribeOptions )
       },
       onFailure: function (err) {
           console.log("mqtt client failed to connect")
           console.log(options)
           console.log(err)
       }
   }
   var mqtt_host = Creds.IOT_ORG_ID + '.messaging.internetofthings.ibmcloud.com'
   var mqtt_port = 1883
   var useTLS = true // true ssl
   var mqttClient = new Messaging.Client(mqtt_host, mqtt_port, "a:" + Creds.IOT_ORG_ID + ":" + "client" + parseInt(Math.random() * 100, 10));
   //console.log('mqttClient: ',mqttClient);
   mqttClient.connect(options)
}