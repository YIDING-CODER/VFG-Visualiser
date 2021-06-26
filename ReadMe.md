# Visualise Planimation VFG using Pixi JS
Load Planimation VFG file locally and visualised with pixi JS.

## Run websever
In the root folder:
```sh
npm install http-server -g
http-server
```

## Update Stage using keyboard

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
