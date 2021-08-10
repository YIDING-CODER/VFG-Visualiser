/**
 * A Planimation JS Library to visualise the plan generate by PDDL solver.
 * This Library is depending on the PIXI JS and requireJS.
 */
define(["https://cdnjs.cloudflare.com/ajax/libs/pixi.js/5.1.3/pixi.min.js"], function () {
    "use strict";

    // Pixi JS objects
    let Application = PIXI.Application,
        loader = PIXI.loader,
        resources = PIXI.loader.resources,
        Sprite = PIXI.Sprite;

    /**
     * Planimation Constructor
     * @param  {String} domainPDDL domain PDDL string
     * @param  {String} problemPDDL problem PDDL string
     * @param  {String} animationPDDL animation PDDL string
     * @param  {String} width define the width of Pixi Canvas
     * @param  {String} height define the height of Pixi Canvas
     */
    function Planimation(domainPDDL, problemPDDL, animationPDDL, width, height) {
        this.domainPDDL = domainPDDL;
        this.problemPDDL = problemPDDL;
        this.animationPDDL = animationPDDL;
        this.width = width;
        this.height = height;
        // visualisation dataset for current stage
        this.currentStage;

        // planimation vfg file
        this.vfg;

        //Create a Pixi Application
        this.app = new Application({
            width: width,
            height: height,
            antialias: true,
            transparent: true,
            resolution: 1
        }
        );
        // The following two line is to change the canvas origin from top left to bottom left.
        this.app.stage.position.y = this.app.renderer.height / this.app.renderer.resolution;
        this.app.stage.scale.y = -1;

        // initialise the pixi canvas
        initialise(this)

    }



    /**
     * call the Planimation API to get VFG file, load the images to pixijs and 
     * then call the set up function to initilaise all the objects.
     * @param  {Plaimation} planimation object
     */
    function initialise(planimation) {

        var formData = new FormData();
        formData.append("domain", planimation.domainPDDL);
        formData.append("problem", planimation.problemPDDL);
        formData.append("animation", planimation.animationPDDL);
    
        var xhr = new XMLHttpRequest();
        var url = 'https://planimation.planning.domains/upload/pddl';
        xhr.open("Post", url);
        xhr.send(formData);
        xhr.onreadystatechange = function (e) {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                var status = xhr.status;
                if (status === 0 || (status >= 200 && status < 400)) {
                    var vfg = JSON.parse(xhr.responseText);
                    
                    // store the VFG file
                    planimation.vfg=vfg;

                    // Use initial stage as the current stage
                    planimation.currentStage = vfg.visualStages[0].visualSprites;

                    //load based64 images and run the setup function when it's done
                    var base64imgs = []
                    for (var i = 0; i < vfg.imageTable.m_keys.length; i++) {
                        var obj = {}
                        obj.name = vfg.imageTable.m_keys[i];
                        obj.url = "data:image/png;base64," + vfg.imageTable.m_values[i];
                        // Pixi resources is a global variable, we have to avoid load same image into pixi resources
                        if (obj.name in resources) {
                            console.log(obj.name + " already exist")
                        } else {
                            base64imgs.push(obj)
                        }

                    }
                    loader
                        .add(base64imgs)
                        .on("progress", loadProgressHandler)
                        .load(() => setup(planimation));

                    //This setup function will run when the image has loaded

                }
            } 

        }

    }

    /**
     * This function is called after the image is loaded into Pixi resources.
     * It creates all the sprites that are going to display on the canvas.
     * Finally it turn on the Pixi ticker to update the canvas
     * @param  {Plaimation} planimation object
     */
    function setup(planimation) {

        // get all the sprites and it's attributes for the current stage.
        var sprites = planimation.currentStage
        
        // Add all the sprites to the canvas
        for (var i = 0; i < sprites.length; i++) {
            if (sprites[i].showname) {
                planimation.app.stage.addChild(getSpriteWithName(sprites[i], planimation.width, planimation.height));
            } else {
                planimation.app.stage.addChild(getSprite(sprites[i], planimation.width, planimation.height));
            }
            // sort the children based on their zIndex
            planimation.app.stage.children.sort((itemA, itemB) => itemA.zIndex - itemB.zIndex);

        }

        //call update canvas 60 times per second
        planimation.app.ticker.add(delta => play(delta, planimation));

    }

    /**
     * Update the scene based on the current stage information
     * @param  {Plaimation} planimation object
     */
    function play(delta, planimation) {

        var sprites = planimation.currentStage

        for (var i = 0; i < sprites.length; i++) {
            // get the sprite based on sprite name
            var spriteUpdate = planimation.app.stage.getChildByName(sprites[i].name);
            
            // Update the sprite location with new position
            spriteUpdate.position.set(sprites[i].minX * planimation.width, sprites[i].minY * planimation.height);

            // Update the sprite with rotate value
            if ('rotate' in sprites[i]) {
                updateRotateSprite(spriteUpdate, sprites[i]);
            }
        }
    }

    /**
     * Create a PIXI sprit object to display on Canvas, sprite name will not be displayed.
     * @param  {JSON} spriteData a JSON all the sprite attributes
     * @param  {Number} width Canvas width
     * @param  {Number} height Canvas height
     * @return {PIXI.Sprite} a PIXI sprite
     */
    function getSprite(spriteData, width, height) {
        // get the image type, block,table,etc
        var textureName = spriteData.prefabimage
        // create sprite/object to display on the canvas, the location(local) is set to be the bottom left
        var spriteObj = new Sprite(resources[textureName].texture);
        spriteObj.texture.rotate = 8
        spriteObj.name = spriteData.name;
        spriteObj.position.set(spriteData.minX * width, spriteData.minY * height);
        spriteObj.width = (spriteData.maxX - spriteData.minX) * width;
        spriteObj.height = (spriteData.maxY - spriteData.minY) * height;
        spriteObj.tint = RGBAToHexA(spriteData.color.r, spriteData.color.g, spriteData.color.b, spriteData.color.a);
        spriteObj.zIndex = spriteData.depth;
        if ('rotate' in spriteData) {
            spriteObj.anchor.set(0.5, 0.5);
            spriteObj.rotation = spriteData.rotate * Math.PI / 180;
            spriteObj.position.set(spriteData.minX * width + (spriteData.maxX - spriteData.minX) * width / 2, spriteData.minY * width);
        }
        return spriteObj;
    }


    /**
     * Create a PIXI sprit object to display on Canvas, sprite name will be displayed.
     * @param  {JSON} spriteData a JSON all the sprite attributes
     * @param  {Number} width Canvas width
     * @param  {Number} height Canvas height
     * @return {PIXI.Sprite} a PIXI sprite
     */

    function getSpriteWithName(sprite, width, height) {
        // get the image type, block,table,etc
        var textureName = sprite.prefabimage
        // create sprite/object to display on the canvas, the location(local) is set to be the bottom left
        var spriteObj = new Sprite(resources[textureName].texture);
        spriteObj.texture.rotate = 8
        spriteObj.name = sprite.name;
        spriteObj.position.set(0, 0);
        spriteObj.width = (sprite.maxX - sprite.minX) * width;
        spriteObj.height = (sprite.maxY - sprite.minY) * height;
        spriteObj.tint = RGBAToHexA(sprite.color.r, sprite.color.g, sprite.color.b, sprite.color.a);

        // create text and put it in the middle of the object
        var sprintText = new PIXI.Text(sprite.name, { fontFamily: 'Arial', fontSize: 20, fill: 0x000000 });
        sprintText.texture.rotate = 8;
        sprintText.name = sprite.name + "Text";
        sprintText.anchor.set(0.5, 0.5);
        sprintText.position.set(spriteObj.width / 2, spriteObj.height / 2);

        // Combine the sprite/object and text as a new object, and set the location(global)
        var spritWithText = new PIXI.Container();
        spritWithText.addChild(spriteObj);
        spritWithText.addChild(sprintText);
        spritWithText.position.set(sprite.minX * width, sprite.minY * width);
        spritWithText.name = spriteObj.name;
        spritWithText.zIndex = sprite.depth;
        if ('rotate' in sprite) {
            updateRotateSprite(spritWithText, sprite);
        }
        
        return spritWithText;
    }
    /**
     * Rotate the PIXI sprit object
     * @param  {PIXI.Sprite} oldSprite sprite needs to be updated
     * @param  {JSON} newSpriteDetail a JSON contains the new rotation value
     */
    function updateRotateSprite(oldSprite, newSpriteDetail) {
        oldSprite.anchor.set(0.5, 0.5);
        oldSprite.rotation = newSpriteDetail.rotate * Math.PI / 180;
        oldSprite.position.set(newSpriteDetail.minX * width + (newSpriteDetail.maxX - newSpriteDetail.minX) * width / 2, newSpriteDetail.minY * width);
    }


    /**
     * PIXI image loading progress function, we may use it in future
     * @param  {PIXI.loader} loader PIXI.loader
     * @param  {PIXI.loader.resources} resource PIXI.loader.resources
     */
    function loadProgressHandler(loader, resource) {

        //If you gave your files names as the first argument 
        //of the add method, you can access them like this
        console.log("loading: " + resource.name);
        //Display the file url currently being loaded
        console.log("loading: " + resource.url);
        //Display the percentage of files currently loaded
        console.log("progress: " + loader.progress + "%");


    }


    /**
     * Convert RGBA color to hex value that PIXI can recognise
     * @param  {Number} r red value (0-1)
     * @param  {Number} g green value (0-1)
     * @param  {Number} b blue value (0-1)
     * @param  {Number} a alpha value (0-1)
     * 
     */
    function RGBAToHexA(r, g, b, a) {
        r = Math.round(r * 255).toString(16);
        g = Math.round(g * 255).toString(16);
        b = Math.round(b * 255).toString(16);
        a = Math.round(a * 255).toString(16);

        if (r.length == 1)
            r = "0" + r;
        if (g.length == 1)
            g = "0" + g;
        if (b.length == 1)
            b = "0" + b;
        if (a.length == 1)
            a = "0" + a;

        return "0x" + r + g + b;
    }
   
    /**
     * Update the planimaiton canvas to display the last action of the plan. 
     * @param  {String} plan a string contains a list of actions.
     * @param  {Boolean} initalStage declare whether to display the inital stage
     * 
     */
    function updateWithPlan(plan, initalStage) {
        var formData = new FormData();
        formData.append("domain", this.domainPDDL);
        formData.append("problem", this.problemPDDL);
        formData.append("animation", this.animationPDDL);
        formData.append("plan", plan);

        var xhr = new XMLHttpRequest();
        var url = 'https://planimation.planning.domains/upload/pddl';
        xhr.open("Post", url);
        xhr.send(formData);
        xhr.onreadystatechange = function (e) {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                var status = xhr.status;
                if (status === 0 || (status >= 200 && status < 400)) {
                    var vfg = JSON.parse(xhr.responseText);
                    if (!initalStage) {
                        this.currentStage = vfg.visualStages[vfg.visualStages.length - 1].visualSprites;
                    }
                    else {
                        this.currentStage = vfg.visualStages[0].visualSprites;
                    }
                }
            }
        }



    }

    Planimation.prototype = {
        constructor: Planimation,
        getView: function () {
            return this.app.view;
        },
        updateWithPlan: updateWithPlan
    };
    return Planimation;

})