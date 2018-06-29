/* 
 import libraries to handle splunksdk and http connections
*/
var http = require('http');
var splunkjs = require('/home/esdcops/mysplunk/node_modules/splunk-sdk');

// create a service instance and log in
var service = new splunkjs.Service (
{
	username:	'esdc',
	host:		'scisplunk.n1data.lan',
	password:	'MTQwZWM0',
	scheme:		'https',
	port:		'8089',
	version:	'6.6.2'
});	

// geojson object (standard format for exchanging geographic information) --> geojson.org
var geojson = {};
geojson['type'] = 'FeaturesCollection';
geojson['features'] = [];


var searchQuery = 'search host=gea03.n1data.lan'+ 
'| iplocation clientip'+
'| table lat lon Country host _time'+
'| append [search "/ufa-cl-web"'+
'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])\\""'+
'| iplocation clientip'+
'| table  lat lon Country host _time]'+
'| append [search "ufa-sl-server"'+
'| rename ClientIP AS clientip'+
'| iplocation clientip'+
'| table lat lon Country host _time]'+
'| append [search host="lpfsa.n1data.lan"'+ 
'| rex field=_raw "\\"(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+ 
'| iplocation clientip'+
'| table lat lon Country host _time]'+
'| append [search host="isssolac.n1data.lan"'+ 
'| rex field=_raw "\\"(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| iplocation clientip'+  
'| table clientip lat lon Country host _time]'+
'| append [ search host=pla'+
'| rex field=_raw "\\"(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| iplocation clientip'+  
'| table clientip lat lon Country host _time]'+
'| append [search host="ssa.esac.esa.int"'+
'| rex field=_raw "\\"(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| iplocation clientip'+
'| table clientip lat lon Country host _time]'+
'| append [search host="vospace.n1data.lan" sourcetype="access_combined"'+
'| rex field=_raw "^(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| iplocation clientip'+
'| table clientip lat lon Country host _time]'+
'| append [search host=csa'+
'| rex field=_raw "^(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+ 
'| iplocation clientip'+
'| table clientip lat lon Country host _time]'+
'| append [search host=ammiapp01'+ 
'| rex field=_raw "^(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+ 
'| iplocation clientip'+
'| table clientip lat lon Country host _time]'+
'| append [search host=ammiapp02'+ 
'| rex field=_raw "^(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+ 
'| iplocation clientip'+
'| table clientip lat lon Country host _time]'+
'| append [search host=gea03.n1data.lan'+
'| iplocation clientip'+
'| table clientip lat lon Country host _time]'+
'| search Country!=""'+
'| table lat lon host _time';


var earliest = '-15m', latest = '-1m';

var searchParams = 
{
	exec_mode:		'blocking',
	earliest_time:	earliest,//'2018-06-25T16:00:00.000',
	latest_time:	latest,//'2018-06-25T16:10:00.000',
	output_mode:	'JSON'	
};

console.log('waiting for the search to finish...');

var savedSearch = service.search ( searchQuery, searchParams, function (err,job)
{
	console.log('...done!\n');
	job.fetch(function(err)
	{	
		console.log("Search job properties\n---------------------");
		console.log("Search job ID:         " + job.sid);
		console.log("The number of events:  " + job.properties().eventCount);
		console.log("The number of results: " + job.properties().resultCount);
		console.log("Search duration:       " + job.properties().runDuration + " seconds");
		console.log("This job expires in:   " + job.properties().ttl + " seconds");
		console.log("Disk usage: " + (parseFloat(job.properties().diskUsage)/1024/1024).toString() + " MB");
		
		// Get the results and display them
		job.results({}, function(err, results)
      	{
		    var fields = results.fields;
		    var rows = results.rows;
        	for(var i = 0; i < rows.length; i++)
        	{
          		var values = rows[i];
          		console.log("Row " + i + ": ");
          		var newFeature = {	'type': 'Feature',
                               		'geometry': {
                                        'type':'Point',
                                        'coordinates':[parseFloat(values[0]),parseFloat(values[1])]
                             	},
                              		'properties':{'host':values[2],'time':values[3] }
           		}
          		geojson['features'].push(newFeature);
          		console.log(newFeature);
        	}
        });
	});
});

savedSearch();


	

