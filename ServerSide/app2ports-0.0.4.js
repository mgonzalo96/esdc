/* 
 import libraries to handle splunk-sdk, urls and http connections
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
var searchQueryNRT = 
'search host=gea03.n1data.lan'+ 
'| iplocation clientip'+
'| eval host="Gaia"'+
'| table lat lon Country host _time clientip'+
'| append [search host="ufa.esac.esa.int"'+
'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="Ulysses"'+
'| iplocation clientip'+
'| table  lat lon Country host _time clientip]'+
'| append [search host="lpfsa.n1data.lan"'+ 
'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="LisaPathfinder"'+ 
'| iplocation clientip'+
'| table lat lon Country host _time clientip]'+
'| append [search host="isssolac.n1data.lan"'+ 
'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="ISSSolACES"'+
'| iplocation clientip'+  
'| table clientip lat lon Country host _time clientip]'+
'| append [ search host=pla'+
'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="Planck"'+
'| iplocation clientip'+  
'| table clientip lat lon Country host _time clientip]'+
'| append [search host="ssa.esac.esa.int"'+
'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="Soho"'+
'| iplocation clientip'+
'| table clientip lat lon Country host _time clientip]'+
'| append [search host="vospace.n1data.lan" sourcetype="access_combined"'+
'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="VOSpace"'+
'| iplocation clientip'+
'| table clientip lat lon Country host _time clientip]'+
'| append [search host=csa'+
'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="Cluster"'+ 
'| iplocation clientip'+
'| table clientip lat lon Country host _time clientip]'+
'| append [search host=ammiapp01 OR host=ammiapp02 sourcetype=esasky_localhost_access'+ 
'| rex field=_raw "^(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
'| eval host="ESASky"'+ 
'| iplocation clientip'+
'| table clientip lat lon Country host _time clientip]'+
'| dedup clientip'+
'| eval lat=if(lat!="",lat,40.4333)'+
'| eval lon=if(lon!="",lon,-3.9666)'+
'| table lat lon host _time';

//span time for our nrt search
var earliestNRT = '-5m', latestNRT = 'now';

//search parameters for the nrt web page
var searchParamsNRT = 
{
	exec_mode:		'blocking',
	earliest_time:	earliestNRT,//'2018-06-25T16:00:00.000',
	latest_time:	latestNRT,//'2018-06-25T16:10:00.000',
	output_mode:	'JSON'	
};

/* geojson object (standard format for exchanging geographic information)
--> geojson.org */	
var geojsonNRT = 
{ 
	'type':		'FeaturesCollection',
    'features':	[]
};	

//create the server listening at port 8123 for the nrt web page
http.createServer( function(req, res)
{
	// Print to terminal that server has been requested
	console.log("We've got a request on " + req.url);
	console.log('reading................');
	

	service.search ( searchQueryNRT, searchParamsNRT, function (err,job)
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
		
			var resCount = 	job.properties().resultCount;
		    var myOffset = 	0;
		    var myCount = 	350;
		    
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
				  		geojsonNRT['features'].push(newFeature);
				  		console.log(newFeature);
					}
					myOffset = myOffset + myCount;
		    		done();
				}, function(err){if (err) console.log("Error: " + err);}
				);
			});
		});
	});
    
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.writeHead(200,{'Content-Type': 'text/plain'});
    res.write(JSON.stringify(geojsonNRT));
    res.end();
    
    geojsonNRT = { 'type':'FeaturesCollection',
                'features':[]
              };
    console.log('finished');
    
}).listen('8123');

/************* end of the nrt web page *********************
************************************************************
************************************************************
**********  start of the sid selector web page  ***********/

var sidSaved = [];
/* geojson object (standard format for exchanging geographic information)
--> geojson.org */
//json object useful for exchange of GI
	var geojson = 
	{ 
		'type':		'FeaturesCollection',
		'features':	[],
		'sid':0.0
	};	
	
var fullHostList = {
					"gea03.n1data.lan":		'search host=gea03.n1data.lan'+ 
											'| iplocation clientip'+
											'| eval host="Gaia"'+
											'| convert mstime(_time) AS ms_time'+
											'| eval ms_time = ms_time * 1000'+
											'| table  lat lon Country host ms_time clientip',
					"ammiapp02":			'| append [search host=ammiapp01 OR host=ammiapp02 sourcetype=esasky_localhost_access'+ 
											'| rex field=_raw "^(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
											'| eval host="ESASky"'+ 
											'| iplocation clientip'+
											'| convert mstime(_time) AS ms_time'+
											'| eval ms_time = ms_time * 1000'+
											'| table  lat lon Country host ms_time clientip]',
					"vospace.n1data.lan":	'| append [search host="vospace.n1data.lan" sourcetype="access_combined"'+
											'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
											'| eval host="VOSpace"'+
											'| iplocation clientip'+
											'| convert mstime(_time) AS ms_time'+
											'| eval ms_time = ms_time * 1000'+
											'| table  lat lon Country host ms_time clientip]',	
					"lpfsa.n1data.lan":		'| append [search host="lpfsa.n1data.lan"'+ 
											'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
											'| eval host="LisaPathfinder"'+ 
											'| iplocation clientip'+
											'| convert mstime(_time) AS ms_time'+
											'| eval ms_time = ms_time * 1000'+
											'| table  lat lon Country host ms_time clientip]',
					"isssolac.n1data.lan":	'| append [search host="isssolac.n1data.lan"'+ 
											'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
											'| eval host="ISSSolACES"'+
											'| iplocation clientip'+
											'| convert mstime(_time) AS ms_time'+
											'| eval ms_time = ms_time * 1000'+
											'| table  lat lon Country host ms_time clientip]',
					"pla":					'| append [ search host=pla'+
											'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
											'| eval host="Planck"'+
											'| iplocation clientip'+ 
											'| convert mstime(_time) AS ms_time'+
											'| eval ms_time = ms_time * 1000'+
											'| table  lat lon Country host ms_time clientip]',
					"ssa.esac.esa.int":		'| append [search host="ssa.esac.esa.int"'+
											'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
											'| eval host="Soho"'+
											'| iplocation clientip'+
											'| convert mstime(_time) AS ms_time'+
											'| eval ms_time = ms_time * 1000'+
											'| table  lat lon Country host ms_time clientip]',
					"ufa.esac.esa.int":		'| append [search host="ufa.esac.esa.int"'+
											'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
											'| eval host="Ulysses"'+
											'| iplocation clientip'+
											'| convert mstime(_time) AS ms_time'+
											'| eval ms_time = ms_time * 1000'+
											'| table  lat lon Country host ms_time clientip]',
					"csa":					'| append [search host="csa"'+
											'| rex field=_raw "(?<clientip>[[octet]]\\.[[octet]]\\.[[octet]]\\.[[octet]])"'+
											'| eval host="Cluster"'+
											'| iplocation clientip'+
											'| convert mstime(_time) AS ms_time'+
											'| eval ms_time = ms_time * 1000'+
											'| table  lat lon Country host ms_time clientip]'
};

//create the server listening at port 8122 for the nrt web page
http.createServer(function(req,res)
{
	
	
	//array with every host selected
	var hostQ = [];
	
	//variables that control the time span
	var earliestT, latestT = "";
	
	//search string for our sid selector web page
	var strQuery = "";
	
	// Print to terminal that server has been requested
    console.log("We've got a request on " + req.url);
       
	// Get the request url
	var urlObj = url.parse(req.url, true);
	console.log(url.parse(req.url).pathname);
	console.log(urlObj);
	console.log(urlObj['query']);
	console.log(urlObj['query'].earliest);
	console.log(urlObj['query'].latest);
	
	//loop for filling the array hostQ
	for (q in urlObj['query'])
	{
	    if (q.startsWith("host")){
		hostQ.push(urlObj['query'][q]);
		console.log(q);
		console.log(urlObj['query'][q]);
		console.log(hostQ.length);
	    }	   	
	}
		
	earliestT = urlObj['query'].earliest;
	latestT = urlObj['query'].latest;
	
	//logic for setting the search
	if (hostQ.includes("gea03.n1data.lan") && hostQ.length > 1){
		strQuery = fullHostList["gea03.n1data.lan"];
		hostQ.splice(hostQ.indexOf('gea03.n1data.lan'), 1 );
		
		hostQ.forEach(function(h){
			strQuery += fullHostList[h];
		});
		
		strQuery += '| dedup clientip'+
					'| eval lat=if(lat!="",lat,40.4333)'+
					'| eval lon=if(lon!="",lon,-3.9666)'+
					'| table lat lon host ms_time';	
		
	} else if (hostQ.includes("gea03.n1data.lan"))
	{
		strQuery  =	'search host=gea03.n1data.lan'+ 
					'| iplocation clientip'+
					'| eval host="Gaia"'+
					'| dedup clientip'+
					'| eval lat=if(lat!="",lat,40.4333)'+
					'| eval lon=if(lon!="",lon,-3.9666)'+
					'| convert mstime(_time) AS ms_time'+
					'| eval ms_time = ms_time * 1000'+
					'| table lat lon host ms_time';
	} else 
	{
		if (hostQ.length > 1) {
			
			var severalHost = hostQ[0]
			var start = fullHostList[severalHost].indexOf("[")+1;
			var end = fullHostList[severalHost].indexOf("| append")-1;
			var firstSubString = fullHostList[severalHost].slice(start,end);
			strQuery += firstSubString;
			
			for (var i=1; i < hostQ.length; i++){
				var eachHost = hostQ[i];
				var eachHostSearch = fullHostList[eachHost];
				strQuery += eachHostSearch;			
			}
			
			strQuery +=	'| dedup clientip'+
						'| eval lat=if(lat!="",lat,40.4333)'+
						'| eval lon=if(lon!="",lon,-3.9666)'+
						'| table lat lon host ms_time';
			
		} else {
			
			var justOneHost = hostQ[0]
			var start = fullHostList[justOneHost].indexOf("[")+1;
			var end = fullHostList[justOneHost].indexOf("| table");
			var subString = fullHostList[justOneHost].slice(start,end);

			strQuery = subString + 	'| dedup clientip'+
									'| eval lat=if(lat!="",lat,40.4333)'+
									'| eval lon=if(lon!="",lon,-3.9666)'+
									'| table lat lon host ms_time';
		}
	}
	
	// Set the search parameters	
	var searchParams = {
	  exec_mode: "blocking",
	  earliest_time: earliestT,
	  latest_time: latestT,
	  output_mode: "JSON"
	};
	
	//sanity check
	console.log(strQuery + " <> " +  earliestT + " <> " + latestT);
	
	// Run a blocking search and get back a job
	service.search(strQuery, searchParams, function(err, job)
	{
		console.log("...done!\n");
		// Get the job from the server to display more info
		job.fetch(function(err)
		{
			console.log("Search job properties\n---------------------");
			console.log("Search job ID:         " + job.sid);
			console.log("The number of events:  " + job.properties().eventCount);
			console.log("The number of results: " + job.properties().resultCount);
			console.log("Search duration:       " + job.properties().runDuration + " seconds");
			console.log("This job expires in:   " + job.properties().ttl + " seconds");
			console.log("Disk usage: " + (parseFloat(job.properties().diskUsage)/1024/1024).toString() + " MB"); 
			
			geojson['sid']= job.sid;
			service.getJob(job.sid, function(err, job) {
	 			job.setTTL(1*3600);
     			console.log("job expires in: " +  job.properties().ttl);
			});
			sidSaved.push(job.sid);
			
			var resCount = 	job.properties().resultCount;
		    var myOffset = 	0;
		    var myCount =	5000;
		  
		  	// Get the results and display them
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
				                                'coordinates':[parseFloat(values[1]),parseFloat(values[0])]
				                     	},
				                      		'properties':{'host':values[2],'time':parseInt(values[3])}
				   		}
				  		geojson['features'].push(newFeature);
				  		console.log(newFeature);
					}
					myOffset = myOffset + myCount;
		    		done();
				}, function(err){if (err) console.log("Error: " + err);}
				);
			}); 
		});    
	});
	
    console.log("hello " + geojson['features'].length);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.writeHead(200,{'Content-Type': 'text/plain'});
    res.write(JSON.stringify(geojson));
    res.end();
   
    strQuery = "";   
    geojson = { 'type':'FeaturesCollection',
                'features':[],
                'sid':0.0
              };
    
    console.log('finished');

}).listen('8122');
	

