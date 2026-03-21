/**
 * SignaturePad — Canvas-based signature capture using WebView
 * Uses already-installed react-native-webview with HTML5 Canvas
 */

import React, {useRef, useImperativeHandle, forwardRef} from 'react';
import {View, StyleSheet} from 'react-native';
import {WebView} from 'react-native-webview';

const SIGNATURE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #FFF; overflow: hidden; touch-action: none; }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: crosshair;
    }
  </style>
</head>
<body>
  <canvas id="sig"></canvas>
  <script>
    const canvas = document.getElementById('sig');
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let hasStrokes = false;
    let paths = [];
    let currentPath = [];

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1A1A2E';
      redraw();
    }

    function redraw() {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      for (const path of paths) {
        if (path.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
      }
      if (currentPath.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        for (let i = 1; i < currentPath.length; i++) {
          ctx.lineTo(currentPath[i].x, currentPath[i].y);
        }
        ctx.stroke();
      }
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      drawing = true;
      currentPath = [getPos(e)];
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!drawing) return;
      currentPath.push(getPos(e));
      redraw();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (currentPath.length > 0) {
        paths.push([...currentPath]);
        hasStrokes = true;
      }
      currentPath = [];
      drawing = false;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'strokeEnd', hasStrokes }));
    }, { passive: false });

    // Mouse support for simulator
    canvas.addEventListener('mousedown', (e) => {
      drawing = true;
      currentPath = [getPos(e)];
    });
    canvas.addEventListener('mousemove', (e) => {
      if (!drawing) return;
      currentPath.push(getPos(e));
      redraw();
    });
    canvas.addEventListener('mouseup', () => {
      if (currentPath.length > 0) {
        paths.push([...currentPath]);
        hasStrokes = true;
      }
      currentPath = [];
      drawing = false;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'strokeEnd', hasStrokes }));
    });

    window.addEventListener('resize', resize);
    resize();

    // Commands from RN
    window.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      if (msg.action === 'clear') {
        paths = [];
        currentPath = [];
        hasStrokes = false;
        redraw();
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cleared' }));
      }
      if (msg.action === 'export') {
        const dpr = window.devicePixelRatio || 1;
        // Create trimmed export canvas
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const ectx = exportCanvas.getContext('2d');
        ectx.fillStyle = '#FFFFFF';
        ectx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        ectx.drawImage(canvas, 0, 0);
        const dataUrl = exportCanvas.toDataURL('image/png');
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'export', dataUrl }));
      }
    });
  </script>
</body>
</html>
`;

const SignaturePad = forwardRef(({style, onStrokeEnd, onExport, onClear}, ref) => {
  const webViewRef = useRef(null);

  useImperativeHandle(ref, () => ({
    clear: () => {
      webViewRef.current?.postMessage(JSON.stringify({action: 'clear'}));
    },
    exportSignature: () => {
      webViewRef.current?.postMessage(JSON.stringify({action: 'export'}));
    },
  }));

  const handleMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'strokeEnd') {
        onStrokeEnd?.(msg.hasStrokes);
      }
      if (msg.type === 'export') {
        onExport?.(msg.dataUrl);
      }
      if (msg.type === 'cleared') {
        onClear?.();
      }
    } catch {}
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{html: SIGNATURE_HTML}}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        onMessage={handleMessage}
        javaScriptEnabled
        originWhitelist={['*']}
      />
    </View>
  );
});

SignaturePad.displayName = 'SignaturePad';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#FFF',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default SignaturePad;
