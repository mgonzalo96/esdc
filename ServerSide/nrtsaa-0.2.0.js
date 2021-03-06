/* 
 import libraries to handle splunksdk, urls and http connections
*/
var http = require('http');
var splunkjs = require('/home/esdcops/mysplunk/node_modules/splunk-sdk');
var url = require('url');

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



//query which retrieve all necessary data
var searchQuery = 'search host=gea03.n1data.lan'+ 
'| iplocation clientip'+
'| eval host="GAIA"'+
'| table lat lon Country host _time clientip'+
'| append [search "/ufa-cl-web"'+
'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])\\""'+
'| eval host="ULYSSES"'+
'| iplocation clientip'+
'| table  lat lon Country host _time clientip]'+
'| append [search "ufa-sl-server"'+
'| rename ClientIP AS clientip'+
'| eval host="ULYSSES"'+
'| iplocation clientip'+
'| table lat lon Country host _time clientip]'+
'| append [search host="lpfsa.n1data.lan"'+ 
'| rex field=_raw "\\"(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="LISAPATHFINDER"'+ 
'| iplocation clientip'+
'| table lat lon Country host _time clientip]'+
'| append [search host="isssolac.n1data.lan"'+ 
'| rex field=_raw "\\"(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="ISS SOLACES"'+
'| iplocation clientip'+  
'| table clientip lat lon Country host _time clientip]'+
'| append [ search host=pla'+
'| rex field=_raw "\\"(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="PLANETARY"'+
'| iplocation clientip'+  
'| table clientip lat lon Country host _time clientip]'+
'| append [search host="ssa.esac.esa.int"'+
'| rex field=_raw "\\"(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="SSA"'+
'| iplocation clientip'+
'| table clientip lat lon Country host _time clientip]'+
'| append [search host="vospace.n1data.lan" sourcetype="access_combined"'+
'| rex field=_raw "^(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="VOSPACE"'+
'| iplocation clientip'+
'| table clientip lat lon Country host _time clientip]'+
'| append [search host=csa'+
'| rex field=_raw "^(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="CSA"'+ 
'| iplocation clientip'+
'| table clientip lat lon Country host _time clientip]'+
'| append [search host=ammiapp01'+ 
'| rex field=_raw "^(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="ESASKY"'+ 
'| iplocation clientip'+
'| table clientip lat lon Country host _time clientip]'+
'| append [search host=ammiapp02'+ 
'| rex field=_raw "^(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="ESASKY"'+ 
'| iplocation clientip'+
'| table clientip lat lon Country host _time clientip]'+
'| search Country!=""'+
'| dedup clientip'+
'| table lat lon host _time';

//span time for our search
var earliest = '-5m', latest = 'now';

//search parameters
var searchParams = 
{
	exec_mode:		'blocking',
	earliest_time:	earliest,//'2018-06-25T16:00:00.000',
	latest_time:	latest,//'2018-06-25T16:10:00.000',
	output_mode:	'JSON'	
};

//testing comment
console.log('waiting for the search to launch...');

/* geojson object (standard format for exchanging geographic information)
--> geojson.org */	
var geojson = { 'type':'FeaturesCollection',
                'features':[]
              };	

var mySavedSearch = function()
{
	service.search ( searchQuery, searchParams, function (err,job)
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
		
			var resCount=job.properties().resultCount;
		    var myOffset=0;
		    var myCount=350;
		    
		    splunkjs.Async.whilst(function(){return (myOffset<resCount);}, function(done)
		    {
				// Get the results and display them
				job.results({count:myCount,offset:myOffset}, function(err, results)
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
					myOffset=myOffset + myCount;
		    		done();
				}, function(err){if (err) console.log("Error: " + err);}
				);
			});
		});
	});
};


http.createServer( function(req, res)
{
	// Print to terminal that server has been requested
	console.log("We've got a request on " + req.url);
	console.log('reading................');
    
    setInterval(mySavedSearch,10000);
    
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.writeHead(200,{'Content-Type': 'text/plain'});
    res.write(JSON.stringify(geojson));
    res.end();
    
    geojson = { 'type':'FeaturesCollection',
                'features':[]
              };
    
}).listen('8123');


	

