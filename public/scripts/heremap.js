class HereMap {

    assets = {};
    asset={};
    greenIcon = new H.map.Icon('https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png');
    yellowIcon = new H.map.Icon('https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png');
    redIcon = new H.map.Icon('https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png');
    violetIcon = new H.map.Icon('https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png');    
    map;
    geoFenceViolation = [];

    constructor(app_Id,api_Key, mapElement) {        
        this.app_Id = app_Id;
        this.api_Key = api_Key;
        // Initialize the platform object:
        this.platform = new H.service.Platform({
            'apikey': this.api_Key
        });

        // Obtain the default map types from the platform object
        this.maptypes = this.platform.createDefaultLayers();
        var initPoint =new H.geo.Point(19.1808, 72.9386);
        // Instantiate (and display) a map object:
        this.map = new H.Map(
            mapElement,            
            this.maptypes.vector.normal.map,
            {
                zoom: 4,//8;
                center: initPoint,//{lat:19.1808,lng:72.9386}, //{lat:19.159627,lng:72.888094} - Mumbai//{lat:20.5937,lng:78.9629} - new delhi//{lat:13.0827,lng:80.2707},// - Chennai
                pixelRatio: window.devicePixelRatio || 1
            });

        // add a resize listener to make sure that the map occupies the whole container
        window.addEventListener('resize', () => this.map.getViewPort().resize());

        // Create the default UI:
        this.ui = H.ui.UI.createDefault(this.map, this.maptypes);
        this.ui.getControl('mapsettings').setAlignment('top-left');;
        this.ui.getControl('zoom').setAlignment('top-left');;
        this.ui.getControl('scalebar').setAlignment('top-left');;

        //mapSettings.setAlignment('top-left');
        //zoom.setAlignment('top-left');
        //scalebar.setDisabled(true);
        //scalebar.setAlignment('top-left');
        //ui.getControl('zoom').setDisabled(false)


        const mapEvent = new H.mapevents.MapEvents(this.map);
        const behavior = new H.mapevents.Behavior(mapEvent);
        this.geofencing = this.platform.getGeofencingService();

         
    this.map.addEventListener("dbltap", (ev) => {
            var coord = this.map.screenToGeo(ev.currentPointer.viewportX, ev.currentPointer.viewportY);
            var clickedContent = 'You clicked the map at ' + Math.abs(coord.lat.toFixed(4)) +
            ((coord.lat > 0) ? 'N' : 'S') +
            ' ' + Math.abs(coord.lng.toFixed(4)) +
             ((coord.lng > 0) ? 'E' : 'W');

          var bubble =  new H.ui.InfoBubble(coord,{content: clickedContent});        
          // show info bubble
          this.ui.addBubble(bubble);            
        }, false);

        this.loadGeoJson('/data/ChennaiZones.geojson');
        this.loadGeofence(this.map);
}


    loadGeoJson(path){
        var reader = new H.data.geojson.Reader(path, {
        style: function (feature) {
        if (feature instanceof H.map.Polygon) {              
            var densityValue = feature.data.properties.density;
            if ( densityValue > 5 ) {
                feature.setStyle({fillColor: 'rgba(207, 0, 15, 1)'});
            }else if ( densityValue >= 1 &&  densityValue <= 5) {
                feature.setStyle({fillColor: 'rgba(240, 255, 0, 1)'});
            }else if ( densityValue == 0 ) {                  
                feature.setStyle({fillColor: 'rgba(30, 130, 76, 1)'});
            }             
        }
        }
    });

    reader.parse();
    var layer = reader.getLayer();
    layer.uiParam = this.ui;
    layer.mapParam = this.map;   
    this.map.addLayer(layer);
    layer.getProvider().addEventListener('tap', function(ev) {        
        var zoneMessage ="<strong>Zone_No: " + ev.target.getData().properties.Zone_No + "</strong><br/>" + ev.target.getData().properties.density + " individual Quarantine";        
        var coord = layer.mapParam.screenToGeo(ev.currentPointer.viewportX, ev.currentPointer.viewportY);
                var bubble =  new H.ui.InfoBubble(coord,{content: zoneMessage});
        layer.uiParam.addBubble(bubble);
    });
}

fenceRequest(layerIds, position,Id) { return new Promise((resolve, reject) => {    
    this.geofencing.request(
        H.service.extension.geofencing.Service.EntryPoint.SEARCH_PROXIMITY,
        {
            'layer_ids': layerIds,
            'proximity': position.lat + "," + position.lng,
            'key_attributes': ['NAME']
        },
        result => {
            resolve(result);
            //console.log('result: ',result);
        }, error => {
            reject(error);
        }
    );
});
}

initTrackableQuarantine(message) {
    var id=message['node_id'];
    //console.log("initializing asset: " + id);
    var latitude = message['lat'];
    var long =message['lng'];
    var temp=message['temperature'];
    var o2=message['spo2'];
    var node ={};
    node = {        
        marker: new H.map.Marker({ lat:latitude,lng:long }, {icon: this.greenIcon}).setData(id + '~greenIcon'),
        points: [ new H.geo.Point(latitude, long) ],
        timestamps: [ new Date().toISOString() ],
        temperature: [temp],
        spo2: [o2]        
    }       
    this.assets[id] = node;   
    if(temp>=98){                    
        this.assets[id]['marker'].setIcon(this.violetIcon).setData(id + '~violetIcon');            
    }
    else if(o2<90){            
        this.assets[id]['marker'].setIcon(this.yellowIcon).setData(id + '~yellowIcon');            
    }
    
    this.assets[id]['marker'].uiValue = this.ui;
    this.assets[id]['marker'].addEventListener('pointermove', function (evt) {
        var markerId = evt.target.getData().split('~');      
        var bubble =  new H.ui.InfoBubble(evt.target.getGeometry(), {content: markerId[0]});
        evt.currentTarget.uiValue.addBubble(bubble);
    }, false);
    this.map.addObject(this.assets[id]['marker']);			
    return node
}

geoFenceViolationColorChange() {
    var count=this.geoFenceViolation.length;
    //debugger;
    if(count!=0 ){        
        for(var index=0;index<count;index++){
            //debugger;
            var qID= this.geoFenceViolation[index];            
            if(qID!=null){
                //debugger;
                var icon= this.assets[qID]['marker'].getData().split('~');
                //console.log('geoFenceViolationColorChange: ',icon[1] );
                if (icon[1]==='greenIcon') {
                    this.assets[qID]['marker'].setIcon(this.redIcon);
                }
            }                            
            var nodeCardItem=document.getElementById("nodeCard"+qID);
            if(nodeCardItem!=null)
            nodeCardItem.style.backgroundColor ="red";
        }
    }
}

renderList() {    
    var nodeListDiv = document.getElementById("nodeList");
    var mapValue = this.map;    
    nodeListDiv.innerHTML = null    
    var assetKeys = Object.keys(this.assets)    
    for (var id in assetKeys) {        
        var nodeCardId= "nodeCard"+assetKeys[id];
        var contactNo = "ContactNo"+nodeCardId;
        var location = this.assets[assetKeys[id]]['points'].slice(-1)[0];
        var lastUpdate = this.assets[assetKeys[id]]['timestamps'].slice(-1)[0];
        var nodeCardDiv = document.createElement('div');
        nodeCardDiv.setAttribute('id', nodeCardId );        
        nodeCardDiv.quarantineID = assetKeys[id];
        nodeCardDiv.quarantineList = this.assets;
        nodeCardDiv.geoFenceViolationList = this.geoFenceViolation;
        nodeCardDiv.setAttribute('class', 'nodeCard');
        nodeCardDiv.innerHTML ="<h2>"+assetKeys[id]+"</h2>"+
        "<p id="+contactNo+' '+"style=display:none;></p>"+
        "<p >Location: "+location+"</p>"+
        "<p >Last Update: "+lastUpdate+"</p>"        
        nodeCardDiv.addEventListener('click', (function(e) {            
            return function(e) {
                var qID = e.currentTarget.quarantineID; 
                if(e.currentTarget.geoFenceViolationList.indexOf(qID)!==-1){
                    var points = e.currentTarget.quarantineList[qID]['points'];
                    var length = points.length;
                    if(length >1){
                        var ContactNoItem=document.getElementById("nodeCard"+qID);
                        if(ContactNoItem!=null){
                            var p = ContactNoItem.getElementsByTagName("P")[0];
                            p.style.display='';
                            p.innerHTML ="Contact Number: 8753468765";
                        }
                        const lineString = new H.geo.LineString();                    
                        for (let index = 0; index < length; index++) {
                            lineString.pushPoint({ lat: points[index].lat, lng: points[index].lng });
                        }
                        const polyLine = new H.map.Polyline(lineString,{style: { 
                            lineWidth: 4,
                            strokeColor: 'rgba(207, 0, 15, 1)' }});
                        mapValue.addObject(polyLine);
                        mapValue.getViewModel().setLookAtData({
                            zoom: 8,
                            bounds: polyLine.getBoundingBox()
                          });                       
                    }
                }            
            }
        })(), false);
        nodeListDiv.appendChild(nodeCardDiv);        		
        document.getElementById("quarantineCount").innerHTML = assetKeys.length;        
    }
    this.geoFenceViolationColorChange();
}

updateTrackableQuarantine(message){
    var id=message['node_id'];
    //console.log("updating asset: " + id);
    var latitude =message['lat'];
    var long =message['lng'];
    var temp=message['temperature'];
    var o2=message['spo2']; 
    var time = new Date().toISOString();
    if ( ! this.assets[id] ){
        //console.log("asset doesn't exist, creating: " + id)
        this.asset = this.initTrackableQuarantine(message)
    } else {
        console.log("loading asset: " + id)
        this.asset = this.assets[id]
    }

    var newLatLng = new H.geo.Point(latitude, long);
    this.fenceRequest(["QUARANTINE"], newLatLng,id).then(result => {
        //debugger;
        if(result.geometries.length > 0) {
            //console.log('result.geometries: ',result);
            console.log("You are within a geofence!")
        } else {
            //console.log("Not within a geofence!");
                //debugger;                    
            if(this.geoFenceViolation.indexOf(id) === -1) {
                //debugger;  
                console.log("Not within a geofence!");                               
                this.geoFenceViolation.push(id);
                this.geoFenceViolationColorChange();                
            }
        }
    });
    
    if(temp>=98){            
        this.asset['marker'].setGeometry(newLatLng).setIcon(this.violetIcon).setData(id + '~violetIcon');
    }
    else if(o2<90){
        this.asset['marker'].setGeometry(newLatLng).setIcon(this.yellowIcon).setData(id + '~yellowIcon');
        
    }else{
        this.asset['marker'].setGeometry(newLatLng).setIcon(this.greenIcon).setData(id + '~greenIcon');            
    }
    
    this.asset['points'].push(newLatLng);
    this.asset['timestamps'].push(time);
    this.map.addObject(this.asset['marker']);
    //console.log("asset location updated");
    
}

loadGeofence(mapObject){    
     var xml = `<?xml version='1.0'?><quaratine_geofence>
     <Id value='1'><P1 lat='19.159627' lng='72.888094'/><P2 lat='19.2016' lng='72.9352' /><P3 lat='19.1698' lng='72.9797' /></Id>"+
     <Id value='2'><P1 lat='19.8031' lng='75.6898'/><P2 lat='19.8044' lng='75.9365' /><P3 lat='19.6991' lng='75.7839' /></Id>
     <Id value='3'><P1 lat='18.9776' lng='76.0737'/><P2 lat='18.8384' lng='76.7527' /><P3 lat='18.6883' lng='76.2321' /></Id>
     <Id value='4'><P1 lat='19.0855' lng='75.45'/><P2 lat='19.0696' lng='75.635' /><P3 lat='18.9848' lng='75.5117' /></Id>
     <Id value='5'><P1 lat='21.8743' lng='79.4224'/><P2 lat='21.8613' lng='79.5906' /><P3 lat='21.7962' lng='79.5135' /></Id>
     <Id value='6'><P1 lat='19.3861' lng='74.072'/><P2 lat='19.3554' lng='74.1699' /><P3 lat='19.3287' lng='74.1047' /></Id>
     <Id value='7'><P1 lat='19.5816' lng='74.3889'/><P2 lat='19.5647' lng='74.4678' /><P3 lat='19.5444' lng='74.4105' /></Id>
     <Id value='8'><P1 lat='20.7947' lng='78.5019'/><P2 lat='20.772' lng='78.7035' /><P3 lat='20.7042' lng='78.6067' /></Id>
     <Id value='9'><P1 lat='10.3915' lng='79.2967'/><P2 lat='10.3574' lng='79.4739' /><P3 lat='10.3081' lng='79.3429' /></Id>
     <Id value='10'><P1 lat='11.0997' lng='77.0977'/><P2 lat='11.0294' lng='76.7682' /><P3 lat='10.9169' lng='76.9687' /></Id>
     <Id value='11'><P1 lat='10.7332' lng='79.3533'/><P2 lat='10.7049' lng='79.5258' /><P3 lat='10.6131' lng='79.4396' /></Id>
     <Id value='12'><P1 lat='9.9616' lng='78.0119'/><P2 lat='9.8989' lng='78.2242' /><P3 lat='9.864' lng='78.1039' /></Id>
     <Id value='13'><P1 lat='11.3894' lng='77.6221'/><P2 lat='11.3524' lng='77.7881' /><P3 lat='11.2932' lng='77.6976' /></Id>
     <Id value='14'><P1 lat='12.8511' lng='79.6013'/><P2 lat='12.8511' lng='79.7801' /><P3 lat='12.7712' lng='79.6833' /></Id>
     <Id value='15'><P1 lat='9.6472' lng='77.8331'/><P2 lat='9.6632' lng='78.1416' /><P3 lat='9.4551' lng='77.9305' /></Id>
     <Id value='16'><P1 lat='13.0903' lng='80.28'/><P2 lat='13.0782' lng='80.2655' /><P3 lat='13.0903' lng='80.2614' /></Id>
     <Id value='17'><P1 lat='23.3381' lng='86.9013'/><P2 lat='23.116' lng='87.0872' /><P3 lat='23.321' lng='87.2917' /></Id>
     <Id value='18'><P1 lat='24.3122' lng='88.034'/><P2 lat='24.2836' lng='88.9101' /><P3 lat='23.8131' lng='88.3091' /></Id>
     <Id value='19'><P1 lat='27.1247' lng='88.0118'/><P2 lat='27.0822' lng='88.5361' /><P3 lat='26.8699' lng='88.3455' /></Id>
     <Id value='20'><P1 lat='23.974' lng='86.5935'/><P2 lat='23.8867' lng='87.1664' /><P3 lat='23.7994' lng='86.9118' /></Id>
     <Id value='21'><P1 lat='23.2839' lng='88.2856'/><P2 lat='23.2252' lng='88.8918' /><P3 lat='23.0786' lng='88.5728' /></Id>
     <Id value='22'><P1 lat='23.6915' lng='87.9978'/><P2 lat='23.722' lng='88.2643' /><P3 lat='23.6' lng='88.1644' /></Id>
     <Id value='23'><P1 lat='26.8242' lng='88.1523'/><P2 lat='26.7974' lng='88.6324' /><P3 lat='26.5829' lng='88.3323' /></Id>
     <Id value='24'><P1 lat='22.8864' lng='88.0364'/><P2 lat='22.9694' lng='88.7277' /><P3 lat='22.4982' lng='88.4271' /></Id>
     </quaratine_geofence>`
     var response = $.parseXML(xml);
     $(response).find("Id").each(function () {
        //var id= $(this).attr('value');
        var P1lat = $(this).find('P1').attr('lat');
        var P1lng = $(this).find('P1').attr('lng');
        var P2lat = $(this).find('P2').attr('lat');
        var P2lng = $(this).find('P2').attr('lng');
        var P3lat = $(this).find('P3').attr('lat');
        var P3lng = $(this).find('P3').attr('lng');
        
        var QuarantineID = new H.geo.LineString();        
        QuarantineID.pushPoint({ lat: P1lat, lng: P1lng });
        QuarantineID.pushPoint({ lat: P2lat, lng: P2lng });
        QuarantineID.pushPoint({ lat: P3lat, lng: P3lng });    
        QuarantineID.pushPoint({ lat: P1lat, lng: P1lng });

        mapObject.addObject(new H.map.Polygon(
            QuarantineID, { style: { lineWidth: 1, fillColor: "#008000", strokeColor: "#000" }}
          ));          
     });
}
}