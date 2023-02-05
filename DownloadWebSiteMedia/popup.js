var btnUpdate = document.getElementById('btnUpdate');

btnUpdate.addEventListener('click', updateState);

chrome.runtime.sendMessage("getState", function(enabled){
 	enabled ? btnUpdate.innerHTML = "Disable" : btnUpdate.innerHTML = "Enable";
});

function updateState() {
  chrome.runtime.sendMessage(btnUpdate.innerHTML);
  if (btnUpdate.innerHTML == "Enable") {
  	btnUpdate.innerHTML = "Disable"
  } else {
  	btnUpdate.innerHTML = "Enable"
  }
  window.close();
}

//document.getElementById('btnSettings').addEventListener('click', function(){
//	chrome.runtime.openOptionsPage();
//});

document.getElementById('btnPlayHlS').addEventListener('click', play_videos);

//function play_videos() {
//  chrome.tabs.executeScript(null, {
//	file: 'hls.' + current_version + '.min.js'
//  }, function () {
//	chrome.tabs.executeScript(null, { file: 'embedded_videos.js' });
//	window.close();
//  });
//}

// code copied from 'globals.js':
var supportedVersions = ["1.1.5", "1.0.12", "0.14.16"]
var currentVersion = supportedVersions[0]

function play_videos(){
  chrome.tabs.executeScript(null, {
      file: 'hls.'+currentVersion+'.min.js'
  }, function() {
      //chrome.tabs.executeScript(null, {file: 'embedded_videos.js'});
	  // code copied from 'embedded_videos.js':
      chrome.tabs.executeScript(null, {code: `
		var videos = document.getElementsByTagName('video');
		for(var i = 0; i<videos.length; i++) {
		  var video = videos[i]
		  var srcs = new Array();
		  if (video.getAttribute("src")) {
			srcs.push(video.getAttribute("src"));
		  }
		  var sources = video.getElementsByTagName('source')
		  for (var i = 0; i < sources.length; i++) {
			srcs.push(sources[i].getAttribute("src"));
		  }
		  for (var i = 0; i < srcs.length; i++) {
			var src = srcs[i]
			if (src.includes(".m3u8")) {
			  hls = new Hls();
			  hls.on(Hls.Events.ERROR, function (event, data) {
				var msg = "Player error: " + data.type + " - " + data.details;
				console.error(msg);
				if (data.fatal) {
				  switch (data.type) {
					case Hls.ErrorTypes.MEDIA_ERROR:
					  handleMediaError(hls);
					  break;
					case Hls.ErrorTypes.NETWORK_ERROR:
					  console.error("network error ...");
					  break;
					default:
					  console.error("unrecoverable error");
					  hls.destroy();
					  break;
				  }
				}
			  });
			  hls.loadSource(src);
			  hls.attachMedia(video);
			  hls.on(Hls.Events.MANIFEST_PARSED, function () { video.play(); });
			}
		  }
		}
	  `});
      window.close();
  });
}