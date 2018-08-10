# face-alignment

Copyright (C) 2017 Anton Skshidlevsky, MIT

The algorithm of face detection and alignment on JavaScript.

Prepare system for Debian/Ubuntu:
```sh
apt install nodejs libopencv-dev
```

Starting in node:
```sh
node detect.js input.png face.png out.png

{ face: { x: 96, y: 50, width: 160, height: 160 },
  eyes: { left: { x: 141, y: 115 }, right: { x: 206, y: 106 } },
  distance: 65.62011886609167,
  angle: -7.8831393167297295 }
```
![input.png](/input.png) ![out.png](/out.png) ![out.png](/face.png)

Starting in browser (available at http://localhost:3000):
```sh
npm start
```
See this video: https://youtu.be/UtkOd42F5-E
