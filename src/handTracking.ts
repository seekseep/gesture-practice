import { HandLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { DraggableRectangle } from './draggable';

export async function initHandTracking() {
  const videoElement = document.getElementById('video') as HTMLVideoElement;
  const canvasElement = document.getElementById('canvas') as HTMLCanvasElement;
  const canvasCtx = canvasElement.getContext('2d')!;

  const draggable = new DraggableRectangle(canvasElement);

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  const handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 2
  });

  const drawingUtils = new DrawingUtils(canvasCtx);

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 }
    });
    videoElement.srcObject = stream;
    await videoElement.play();

    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    detectHands();
  }

  let lastVideoTime = -1;

  function detectHands() {
    const currentTime = videoElement.currentTime;

    if (currentTime !== lastVideoTime) {
      lastVideoTime = currentTime;
      const results = handLandmarker.detectForVideo(videoElement, performance.now());

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      // カメラ映像を左右反転
      canvasCtx.translate(canvasElement.width, 0);
      canvasCtx.scale(-1, 1);
      canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.restore();
      canvasCtx.save();

      // 手のジェスチャーで四角形を操作
      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        const wrist = landmarks[0];

        // 左右反転に対応
        const indexX = (1 - indexTip.x) * canvasElement.width;
        const indexY = indexTip.y * canvasElement.height;

        const distance = Math.sqrt(
          Math.pow((indexTip.x - thumbTip.x) * canvasElement.width, 2) +
          Math.pow((indexTip.y - thumbTip.y) * canvasElement.height, 2)
        );

        // 各指の先端から手首までの距離を計算（手が閉じているか判定）
        const getDistance = (tip: any) => Math.sqrt(
          Math.pow((tip.x - wrist.x) * canvasElement.width, 2) +
          Math.pow((tip.y - wrist.y) * canvasElement.height, 2)
        );

        const indexDist = getDistance(indexTip);
        const middleDist = getDistance(middleTip);
        const ringDist = getDistance(ringTip);
        const pinkyDist = getDistance(pinkyTip);

        // 全ての指が手首に近い場合、手が閉じていると判定
        const avgDist = (indexDist + middleDist + ringDist + pinkyDist) / 4;
        const isClosed = avgDist < 150;

        const isPinching = distance < 40;
        draggable.updateHandPosition(indexX, indexY, isPinching, isClosed);

        // デバッグ情報を表示
        if (isPinching) {
          canvasCtx.fillStyle = '#FFFFFF';
          canvasCtx.font = '16px Arial';
          canvasCtx.fillText(`距離: ${avgDist.toFixed(0)}px ${isClosed ? '閉' : '開'}`, 10, 30);
        }

        // 人差し指の位置を表示
        canvasCtx.fillStyle = isPinching ? '#FF0000' : '#00FF00';
        canvasCtx.beginPath();
        canvasCtx.arc(indexX, indexY, 10, 0, 2 * Math.PI);
        canvasCtx.fill();
      }

      draggable.draw(canvasCtx);

      if (results.landmarks) {
        for (const landmarks of results.landmarks) {
          // ランドマークを左右反転
          const flippedLandmarks = landmarks.map(l => ({
            x: 1 - l.x,
            y: l.y,
            z: l.z
          }));

          drawingUtils.drawConnectors(flippedLandmarks, HandLandmarker.HAND_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: 5
          });
          drawingUtils.drawLandmarks(flippedLandmarks, {
            color: '#FF0000',
            lineWidth: 2
          });
        }
      }

      canvasCtx.restore();
    }

    requestAnimationFrame(detectHands);
  }

  await startCamera();
}
