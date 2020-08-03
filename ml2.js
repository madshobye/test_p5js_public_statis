
// Predict the current frame.
function classify() {

  // Get the total number of labels from knnClassifier
  const numLabels = knnClassifier.getNumLabels();
  
    if (numLabels <= 0) {
      console.error('There is no examples in any label');
      doClassify = false;
      return;
    }

    if (poses != undefined && poses.length > 0) {
      // Convert poses results to a 2d array [[score0, x0, y0],...,[score16, x16, y16]]
      const poseArray = poses[0].pose.keypoints.map(p => [p.score, p.position.x, p.position.y]);

      // Use knnClassifier to classify which label do these features belong to
      // You can pass in a callback function `gotResults` to knnClassifier.classify function
      knnClassifier.classify(poseArray, gotResults);
    } else {
      doClassifyBroke = true;

    }
  
}

function saveRequested() {
  
}

function gotResults(err, result) {
  // Display any error
  if (err) {
    console.error(err);
  }

  if (result.confidencesByLabel) {
    confidences = result.confidencesByLabel;
   // print("---results--");
  }
  
}
