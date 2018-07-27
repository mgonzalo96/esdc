var splunkjs = require('/home/esdcops/mysplunk/node_modules/splunk-sdk');

// Create a Service instance and log in 
var service = new splunkjs.Service({
  username:"esdc",
  host:"scisplunk.n1data.lan",
  password:"MTQwZWM0",
  scheme:"https",
  port:"8089",
  version:"6.6.2"
});


console.log("Wait for the search to finish...");

var myJobs = service.jobs();

myJobs.fetch(function(err, jobs) {
  
  // Determine how many jobs are in the collection
  var jobsList = myJobs.list() || [];
  console.log("There are " + jobsList.length + " jobs available to the current user");

  // Loop through the collection and display each job's SID
  for(var i = 0; i < jobsList.length; i++) {
    console.log((i + 1) + " sid: " + jobsList[i].sid);
    console.log((i + 1) + " isDone: " + jobsList[i].properties().isDone);
    console.log((i + 1) + " runDuration: " + jobsList[i].properties().runDuration);
    console.log((i + 1) + " eventCount: " + jobsList[i].properties().eventCount);
    console.log((i + 1) + " doneProgress: " + jobsList[i].properties().doneProgress);
    console.log((i + 1) + " dispatchState: " + jobsList[i].properties().dispatchState);
    console.log("This job expires in:   " + jobsList[i].properties().ttl + " seconds");

  };
});

service.getJob(1532505320.3267, function(err, job) {
	 job.setTTL(1*3600);
     console.log("job expires in: " +  job.properties().ttl);
});


console.log("Wait for the search to finish...");



