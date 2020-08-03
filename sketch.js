/*
TODO:,

High wishes:
- omvendt lyd.

Done today:
x fjern mute - indsæt i stedet tom lydfil.
x input volume visualizer
x mute sounds when recording.
x clear sounds when clear poses.
x make pose 0 full mute
x fix video resolution.
x merge soundrecorder and preloaded player
x first pose needs to be created without sound recording. 
x created dynamic loading of soundfiles (match between num sound files and num poses).
x cleaned up skeleton for machine learning
x removed glitching sounds in recording mode


Recordmode bugs

x sound play/loops needs to be started for each sound.


General list of todos
- make klassifier counter a part of the model and not a variable
- track and control volume for multiple people.
- slet af poses 
- make high noiselevel og low når der er hul igennem
- pause sound when low sound.
- find current detected pose and level
- tracking multiple bodies.
- show skeleton
- Test af pose parametre
- unique id generator.
- only play sounds with poses (fix minvolume bbug 
- key bindings for gui.
- make a vsiualizer.


x save audio recording
x save skeleton recording.
x framerate smooth
x pressed multiframe record.
x mute when no body is tracked.
x Mute pose (firdst pose is mute pose)
x soft transistion between sounds
x lav grundlyd
x transition scrollbar
x uiToggle 
x Recordbutton
x Record sound + pose


*/

/*
  ####################################
  SETTINGS
  ####################################
*/
var classifierName = "myKNN_with_lamps_two_mute.json";
var recordSound = false;




/*
  ####################################
  VARIABLES
  ####################################
*/
// Create a KNN classifier
let mic, recorder, soundFile;
let video;
const knnClassifier = ml5.KNNClassifier();
let poseNet;
let poses = [];
let poseCount = [];
var curCleanedPose;
var confidences;
var soundTransition = new uiFloat(0.33);
var doClassify = false;
var showVideo = true;
var classifierCounter = 0;
var sounds = [];
var soundFileList = [];
var showSkeleton = true;
var showUI = false;
var playSounds = false;
var framerate = 0;
var muted = false;
var minVolume = new uiFloat(0);
var inputVolume = new uiFloat(0);
var automaticPause = false;
var redButtonPressed = false;
var redButtonPressedOld = false;
var recording = false;
var recordExampleKey;
var amplitude;


function preload() {

  soundFileList.push('audio3/nosound.wav');
  soundFileList.push('audio2/aasem2.mp3');
  soundFileList.push('audio2/darren.mp3');
  soundFileList.push('audio2/fabienne.mp3');
  soundFileList.push('audio2/magn.mp3');
  soundFileList.push('audio2/peter.mp3');
  soundFileList.push('audio2/brittacopy.mp3');
  soundFileList.push('audio2/elisabeth.mp3');
  soundFileList.push('audio2/lea.mp3');
  soundFileList.push('audio2/mie1.mp3');
  soundFileList.push('audio2/tina.mp3');
  soundFileList.push('audio2/cosmo.mp3');
  soundFileList.push('audio2/eva.mp3');
  soundFileList.push('audio2/nanna.mp3');
 // soundFileList.push('audio3/nosound.wav');
  soundFileList.push('audio3/1lise.mp3');
  soundFileList.push('audio3/2lise.mp3');
  soundFileList.push('audio3/3lise.mp3');
  soundFileList.push('audio3/4troels.mp3');
  soundFileList.push('audio3/5troels.mp3');
  soundFileList.push('audio3/6troels.mp3');


}

function loadData() {
  knnClassifier.load(classifierName, customModelReady);


}

function customModelReady() {

  console.log("model loaded" + knnClassifier.getNumLabels());
  print(knnClassifier);
  classifierCounter = knnClassifier.getNumLabels();
  for (var i = 0; i < knnClassifier.getNumLabels(); i++) {
    // print(knnClassifier.mapStringToIndex[i]);
    sounds.push(loadSound(soundFileList.shift()));
  }
  doClassify = true;


}

function modelReady() {

  showUI = true;
}


function setup() {
 frameRate(100);
  const canvas = createCanvas(windowWidth, windowHeight);
  setupGamepad();

  canvas.parent('videoContainer');
  let constraints = {
    video: {
      mandatory: {
        minWidth: 1280,
        minHeight: 720
      }
     // ,optional: [{ maxFrameRate: 10 }]
    },
    audio: false
  };
  video = createCapture(constraints, function(stream) {
    console.log(stream);
  });

  video.size(1280, 720);
  //video.size(640,480);
  print(video.height);

  //video.size(1920,1080);
  video.hide();


  //https://ml5js.org/docs/PoseNet
  // Create a new poseNet method with a single detection
  //https://learn.ml5js.org/docs/#/reference/posenet
  const poseOptions =

    {
      imageScaleFactor: 0.5,
      outputStride: 32,
      flipHorizontal: false,
      minConfidence: 0.3,
      maxPoseDetections: 1,
      scoreThreshold: 0.5,
      nmsRadius: 20,
      detectionType: 'single-pose',
      multiplier: 1,
    }
  /*
 {
  architecture: 'MobileNetV1',
  imageScaleFactor: 0.3,
  outputStride: 16,
  flipHorizontal: false,
  minConfidence: 0.5,
  maxPoseDetections: 1,
  scoreThreshold: 0.5,
  nmsRadius: 20,
  detectionType: 'single',
  inputResolution: 513,
  multiplier: 0.75,
  quantBytes: 2,
};*/






  poseNet = ml5.poseNet(video, poseOptions, modelReady);
  // poseNet = ml5.poseNet(video, 'single', modelReady);
  //poseNet.singlePose();

  // This sets up an event that fills the global variable "poses"
  // with an array every time new poses are detected
  poseNet.on('pose', function(results) {
    poses = results;
    if (poses.length > 0) {
      curCleanedPose = cleanUpPose(poses[0]);
    }
    if (doClassify) {
      classify();

    }
    if (recordExampleKey != undefined) {
      addExample(recordExampleKey);
    }

  });


  // create an audio in
  mic = new p5.AudioIn();

  // users must manually enable their browser microphone for recording to work properly!
  mic.start();

  // create a sound recorder
  recorder = new p5.SoundRecorder();

  // connect the mic to the recorder
  recorder.setInput(mic);
  amplitude = new p5.Amplitude();
  amplitude.setInput(mic);



}

var timer = 0;

function draw() {

  background(0);


  var videoRatio = video.height / video.width;
  var videoScaling = (windowWidth) / video.width;

  if (showVideo) {
    image(video, 0, 0, windowWidth, videoRatio * (windowWidth));
  }

  uiUpdate(mouseX, mouseY, mouseIsPressed, key, width, height);

  if (uiButton("X", color(0, 0, 0, 0), 40, 40, 0, 0).clicked) {
    showUI = !showUI;

  }

  if (showUI) {
    drawUI();
  }


  // somebody to track
  if (poses != undefined && poses.length > 0) {

    if (showSkeleton) {
      push();

      scale(videoScaling);


      drawKeypoints(poses[0]);
      drawSkeleton(poses[0]);

      curCleanedPose.draw();
      pop();

    }


    var i = 0;
    if (confidences != undefined) {
      for (let [key, value] of Object.entries(confidences)) {
        var curColor = color(255 - Math.round(value * 255));

        if (i < sounds.length && !recording) {
          if (i == 0) {
            // preventing first sound to play = muted.
          }
          if (automaticPause) {
            if (value == 0) {
              sounds[i].pause();
            } else if (!sounds[i].isPlaying()) {
              sounds[i].play();
            }
          } else {
            let tmpVolume = max(minVolume.get(), value);

            //print(i + " " + tmpVolume);
            sounds[i].setVolume(tmpVolume, soundTransition.get());
          }


        }
        i++;
        muted = false;
      }
    }
  }
  // nobody on the screen - nothing to track
  else if (!recording && !muted && (poses == undefined || (poses != undefined && poses.length == 0))) {
    for (let i = 0; i < sounds.length; i++) {
      var tmpVolume = max(minVolume.get(), 0);
      sounds[i].setVolume(tmpVolume, soundTransition.get());
    }
    muted = true;
  }

  if (gamePads !== undefined && gamePads.length > 0) {
    redButtonPressed = gamePads[0].state["FACE_1"];
    if (redButtonPressed) {

      if (!redButtonPressedOld) {

        startPoseRecording();


      } else {


      }

    } else if (redButtonPressedOld) {
      endPoseRecording();

    }
    redButtonPressedOld = redButtonPressed;
  }

  if (recording && confidences != undefined) {
    recordExampleKey = Object.keys(confidences)[Object.keys(confidences).length - 1];

  }



  //gamePads[i].state["LEFT_STICK_X"]
  //gamePads[i].state["FACE_1"]

}


var recordingSound = false;
var recordingName = "";

function startPoseRecording() {
  if (poses != undefined && poses.length > 0) {
    recordingName = addPose();

    doClassify = false;
    // mute all sounds
    for (let i = 0; i < sounds.length; i++) {
      playSounds = false;
      sounds[i].stop();

    }

    if (recordSound) {
      recordingSound = false;

      if (classifierCounter > 1) // hack not pretty muting first
      {
        setTimeout(startSoundRecording, 100)
      }
    }


    recording = true;
  }
}

function startSoundRecording() {
  recordingSound = true
  // create an empty sound file that we will use to playback the recording
  soundFile = new p5.SoundFile();
  recorder.record(soundFile);
}

function endPoseRecording() {

  if (recordSound) {
    if (recordingSound) {
      recorder.stop(); // stop recorder, and send the result to soundFile
      // soundFile.play();

      sounds.push(soundFile);
      if (playSounds) {
        sounds[sounds.length - 1].loop();
        sounds[sounds.length - 1].setVolume(0);
      }

      save(soundFile, recordingName + '.wav');

    } else { // add empty sound to secure spot
      sounds.push(loadSound('audio3/nosound.wav'));
    }
  } else // no sound recording - adding from list instead.
  {
    if (soundFileList.length > 0 && classifierCounter > 1) {

      sounds.push(loadSound(soundFileList.shift()));
    } else {
      sounds.push(loadSound('audio3/nosound.wav'));
    }
  }
  // saveRequested();
  doClassify = true;




  // save(soundFile, 'mySound.wav');
  recordExampleKey = undefined;
  recording = false;
}



function drawUI() {


  var i = 0;
  var xPos = -50;
  var yPos = 120;

  uiContainerStart(50, 40);



  if (uiToggle("Sound", playSounds).clicked) {
    playSounds = !playSounds;
    if (!playSounds) {
      // .isPlaying() returns a boolean
      for (var i = 0; i < sounds.length; i++) {
        sounds[i].stop();
      }
    } else {
      for (var i = 1; i < sounds.length; i++) {
        sounds[i].loop();
        sounds[i].setVolume(0);
      }

    }

  }
  if (uiScrollbar("Min volume (" + minVolume.get() + ")", 0, 0.5, minVolume).clicked) {

  }
  if (uiScrollbar("Transition (" + soundTransition.get() + ")", 0, 3, soundTransition).clicked) {

  }




  if (uiToggle("Classify", doClassify).clicked) {


    doClassify = !doClassify;
  }

  if (uiToggle("Rec sound", recordSound).clicked) {

    recordSound = !recordSound;
  }



  if (uiToggle("Video", showVideo).clicked) {
    showVideo = !showVideo;
  }

  if (uiToggle("Skeleton", showSkeleton).clicked) {
    showSkeleton = !showSkeleton;
  }

  if (uiToggle("Auto pause", automaticPause).clicked) {
    automaticPause = !automaticPause;
  }




  if (uiButton("Download").clicked) {
    knnClassifier.save();
  }
  if (uiButton("Load").clicked) {
    loadData();

  }

  var recordColor = color(255, 0, 0);

  var uio = uiButton("Record", recordColor);

  if (uio.pressed) {
    if (!recording) {
      startPoseRecording();
    }
  } else if (uio.pressedUp) {
    if (recording) {
      endPoseRecording();
    }
  }


  inputVolume.set(amplitude.getLevel());
  uiScrollbar("Mic vol", 0, 0.2, inputVolume)

  if (uiButton("printposes").clicked) {
    print(poses);
  }

  framerate = framerate * 0.9 + 0.1 * 1000 / (millis() - timer);
  uiText("Framerate: " + Math.round(framerate));
  uiText("C:" + classifierCounter +
    "S:" + sounds.length +
    "F:" + soundFileList.length +
    "K:" + knnClassifier.getNumLabels());
  timer = millis();
  uiContainerEnd();

  uiContainerStart(290, 40);
  if (confidences != undefined) {


    for (let [key, value] of Object.entries(confidences)) {
      var curColor = color(255 - Math.round(value * 255));

      if (uiButton(key.substring(key.indexOf("_")) + ": " + Math.round(value * 100) + " (" + poseCount[key] + ")", curColor).pressed) {


        addExample(key);

      }

      xPos = xPos + 0;
      yPos = yPos + 220;
      i++;
    }

  }

  if (uiButton("+ pose").clicked && poses.length > 0) {
    doClassify = true;
    addPose();
    if (soundFileList.length > 0 && classifierCounter > 1) {

      sounds.push(loadSound(soundFileList.shift()));
    } else {
      sounds.push(loadSound('audio3/nosound.wav'));
    }
  }

  if (uiButton("Clear all").clicked) {
    knnClassifier.clearAllLabels();
    for (let i = 0; i < sounds.length; i++) {
      sounds[i].stop();
    }
    sounds = [];
    confidences = undefined;
    classifierCounter = 0;

    poseCount = [];

  }

  uiContainerEnd();

}




// Add the current frame from the video to the classifier
function addExample(label) {
  if (poses != undefined && poses.length > 0) {

    // Convert poses results to a 2d array [[score0, x0, y0],...,[score16, x16, y16]]
    const poseArray = poses[0].pose.keypoints.map(p => [p.score, p.position.x, p.position.y]);
    if (poseCount[label] == undefined) {
      poseCount[label] = 0;
    }
    poseCount[label]++;
    // Add an example with a label to the classifier
    knnClassifier.addExample(poseArray, label);
    // updateCounts();
  }
}


function addPose() {

  var name = new Date().getTime() + "_pose_" + classifierCounter;
  print(name);
  addExample(name);
  classify();
  classifierCounter = classifierCounter + 1;
  return name;

}

class cleanedPose {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.keyPoints = [];
  }

  draw() {
    stroke(0);
    push();
    noFill();
    translate(this.x, this.y);


    rect(0, 0, this.width, this.height);
    //fill(0);
    for (var i = 0; i < this.keyPoints.length; i++) {

      var position = this.keyPoints[i].position;
      ellipse(position.x, position.y, 20, 20);
    }
    pop();
  }
}


function cleanUpPose(pose) {
  var cPose = new cleanedPose();
  cPose.x = 10000;
  cPose.y = 10000;
  for (let j = 0; pose.pose.keypoints != undefined && j < pose.pose.keypoints.length; j++) {
    // A keypoint is an object describing a body part (like rightArm or leftShoulder)
    let keypoint = pose.pose.keypoints[j];
    let position = keypoint.position;
    // Only draw an ellipse is the pose probability is bigger than 0.2
    if (keypoint.score > 0.2) {
      if (position.x < cPose.x) {
        cPose.x = position.x;

      }
      if (position.y < cPose.y) {
        cPose.y = position.y;
      }
      if (position.x > cPose.width) {
        cPose.width = position.x;
      }

      if (position.y > cPose.height) {
        cPose.height = position.y;
      }


      cPose.keyPoints.push({
        position: {
          x: position.x,
          y: position.y
        },
        score: keypoint.score
      });

    }
  }
  for (var i = 0; i < cPose.keyPoints.length; i++) {
    cPose.keyPoints[i].position.x -= cPose.x;
    cPose.keyPoints[i].position.y -= cPose.y;
  }
  cPose.width = cPose.width - cPose.x;
  cPose.height = cPose.height - cPose.y;


  //cPose.draw();



  return cPose;


}

function cleanUpSkeleton(skeleton) {
  var minX = 1000;
  var minY = 1000;
  for (let j = 0; j < skeleton.length; j++) {



    let partA = skeleton[j][0];
    let partB = skeleton[j][1];

    minX = Math.min(minX, partA.position.x);

    minY = Math.min(minY, partA.position.y);

    minX = Math.min(minX, partB.position.x);
    minY = Math.min(minY, partB.position.y);



  }

  for (let j = 0; j < skeleton.length; j++) {

    // console.log(j);

    /*skeleton[j][0].position.x =  skeleton[j][0].position.x - minX;
    skeleton[j][0].position.y =  skeleton[j][0].position.y - minY;
    skeleton[j][1].position.x =  skeleton[j][1].position.x - minX;
    skeleton[j][1].position.y =  skeleton[j][1].position.y - minY;*/
  }
  return skeleton;
}





// A function to draw ellipses over the detected keypoints
function drawKeypoints(pose) {
  // Loop through all the poses detected


  for (let j = 0; pose.pose.keypoints != undefined && j < pose.pose.keypoints.length; j++) {
    // A keypoint is an object describing a body part (like rightArm or leftShoulder)
    let keypoint = pose.pose.keypoints[j];
    // Only draw an ellipse is the pose probability is bigger than 0.2
    if (keypoint.score > 0.2) {
      fill(255, 0, 0);
      noStroke();
      ellipse(keypoint.position.x, keypoint.position.y, 10, 10);
    }
  }

}

// A function to draw the skeletons
function drawSkeleton(pose) {

  let skeleton = pose.skeleton;
  // For every skeleton, loop through all body connections
  for (let j = 0; j < skeleton.length; j++) {
    let partA = skeleton[j][0];
    let partB = skeleton[j][1];
    stroke(255, 0, 0);
    line(partA.position.x, partA.position.y, partB.position.x, partB.position.y);
  }

}


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}


function mousePressed() {

}

function keyReleased() {

  if (key == 'f') {
    var fs = fullscreen();
    fullscreen(!fs);
  }
}

function noScrolling() {
  document.addEventListener('touchstart', function(event) {
    event.preventDefault();
  }, {
    passive: false
  });
}