# Visualise Planimation VFG using Pixi JS
Load Planimation VFG file locally and visualise with pixi JS.

## Run the web sever
In the root folder:
```sh
npm install http-server -g
http-server
```

## Update stage using keyboard

* Previous - Arrow Left
* Next Stage - Arrow Right

## Choose VFG File
Update Line17 of the ```index.html```
```sh
       $.getJSON("vfgFiles/grid.vfg", function (vfg) {...
```

## Resources
* Pixi JS - https://www.pixijs.com/
* Pixi JS Tutorial - https://github.com/kittykatattack/learningPixi
* Pixi JS Demos - https://pixijs.io/examples/#/demos-basic/container.js
