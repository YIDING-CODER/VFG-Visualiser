 define(["../pixi.min.js"], function() {
    "use strict";
    let Application = PIXI.Application,
    loader = PIXI.loader,
    resources = PIXI.loader.resources,
    Sprite = PIXI.Sprite;

    function Planimation(domainPDDL,problemPDDL,animationPDDL,width, height) {
        if (!(this instanceof Planimation)) {
            throw new TypeError("Person constructor cannot be called as a function.");
        }
        this.domainPDDL = domainPDDL;
        this.problemPDDL = problemPDDL;
        this.animationPDDL = animationPDDL;
        this.width=width;
        this.height=height;
        this.appStage;
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
        
  
    }

    function initialise(){
        var formData = new FormData();
        formData.append("domain", this.domainPDDL);
        formData.append("problem", this.problemPDDL);
        formData.append("animation", this.animationPDDL);
        const xhr = new XMLHttpRequest();
        const url='https://planimation.planning.domains/upload/pddl';
        xhr.open("Post", url);
        xhr.send(
            formData
        );

        xhr.onreadystatechange = (e) => {

            if(xhr.readyState === XMLHttpRequest.DONE) {
                var status = xhr.status;
                if (status === 0 || (status >= 200 && status < 400)) {
                    
                    var vfg=JSON.parse(xhr.responseText);
                    this.appStage=vfg.visualStages[0].visualSprites;
                    var base64imgs = []
                    for (var i = 0; i < vfg.imageTable.m_keys.length; i++) {
                        var obj = {}
                        obj.name = vfg.imageTable.m_keys[i];
                        obj.url = "data:image/png;base64," + vfg.imageTable.m_values[i];
                        // resources is a global variable, we have to avoid load same image into pixi resources
                        if (obj.name in resources){
                            console.log(obj.name +" already exist")
                        }else{
                            base64imgs.push(obj)
                        }
                        
                    }
                    //load based64 images and run the setup function when it's done
                    loader
                        .add(base64imgs)
                        .on("progress", loadProgressHandler)
                        .load(()=>setup(this));
                    
                     //This setup function will run when the image has loaded

                }

            }else {
                // Not success yet
                
              }
            
            }



    }
    function setup(planimation) {
        // get all the sprites and it's attributes for the current stage.
        var sprites = planimation.appStage

        // Add all the sprites to the canvas
        for (var i = 0; i < sprites.length; i++) {
            if (sprites[i].showname) {
                planimation.app.stage.addChild(getSpriteWithName(sprites[i],planimation.width,planimation.height));
            } else {
                planimation.app.stage.addChild(getSprite(sprites[i],planimation.width,planimation.height));
            }
            // sort the children based on their zIndex
            planimation.app.stage.children.sort((itemA, itemB) => itemA.zIndex - itemB.zIndex);

        }

        //call update canvas 60 times per second
        planimation.app.ticker.add(delta => play(delta,planimation));

    }

    function getSprite(sprite,width,height) {
        var textureName = sprite.prefabimage
        var spriteObj = new Sprite(resources[textureName].texture);
        spriteObj.texture.rotate = 8
        spriteObj.name = sprite.name;
        spriteObj.position.set(sprite.minX * width, sprite.minY * height);
        spriteObj.width = (sprite.maxX - sprite.minX) * width;
        spriteObj.height = (sprite.maxY - sprite.minY) * height;
        spriteObj.tint = RGBAToHexA(sprite.color.r, sprite.color.g, sprite.color.b, sprite.color.a);
        spriteObj.zIndex = sprite.depth;
        console.log(sprite.depth)
        if ('rotate' in sprite) {
            spriteObj.anchor.set(0.5, 0.5);
            spriteObj.rotation = sprite.rotate * Math.PI / 180;
            spriteObj.position.set(sprite.minX * width + (sprite.maxX - sprite.minX) * width / 2, sprite.minY * width);
        }
        return spriteObj;
    }

    function getSpriteWithName(sprite,width,height) {
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
        if ('rotate' in sprite) {
            updateRotateSprite(spritWithText,sprite);
        }
        spritWithText.zIndex = sprite.depth;
        return spritWithText;
    }
    function updateRotateSprite(oldSprite,newSprite){
        oldSprite.anchor.set(0.5, 0.5);
        oldSprite.rotation = newSprite.rotate * Math.PI / 180;
        oldSprite.position.set(newSprite.minX * width + (newSprite.maxX - newSprite.minX) * width / 2,newSprite.minY * width);
    }

    // Progress function, we may use it in future
    function loadProgressHandler(loader, resource) {

        //Display the file url currently being loaded
        console.log("loading: " + resource.url);
        console.log(resource.texture);
        //Display the percentage of files currently loaded
        console.log("progress: " + loader.progress + "%");
        
        //If you gave your files names as the first argument 
        //of the add method, you can access them like this
        //console.log("loading: " + resource.name);
        }
    
    
    // Convert RGBA color to hex value
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
        

        // Update the scene based on the new stage information
        function play(delta,planimation) {

            var sprites = planimation.appStage

            for (var i = 0; i < sprites.length; i++) {
                // get the previous loaded sprite
                var spriteUpdate = planimation.app.stage.getChildByName(sprites[i].name);
                // Update the sprite location with new position
                spriteUpdate.position.set(sprites[i].minX * planimation.width, sprites[i].minY * planimation.height);

                // Update the sprite with rotate value
                if ('rotate' in sprites[i]) {
                    updateRotateSprite(spriteUpdate,sprites[i]);
                }
            }
        }

        
        function updateWithPlan(plan,nodeName) {
            var formData = new FormData();
            formData.append("domain", this.domainPDDL);
            formData.append("problem", this.problemPDDL);
            formData.append("animation", this.animationPDDL);
            formData.append("plan", plan);
        
            const xhr = new XMLHttpRequest();
            const url='https://planimation.planning.domains/upload/pddl';
            xhr.open("Post", url);
            xhr.send(
                formData
            );
            console.log("sent")
            xhr.onreadystatechange = (e) => {
        
                  if(xhr.readyState === XMLHttpRequest.DONE) {
                    var status = xhr.status;
                    if (status === 0 || (status >= 200 && status < 400)) {
                        var vfg=JSON.parse(xhr.responseText);
                        // toastr.success('Planimation Update found!');
                       
                        if (nodeName != "root"){
                            this.appStage = vfg.visualStages[vfg.visualStages.length-1].visualSprites;
                        }
                        else{
                            this.appStage = vfg.visualStages[0].visualSprites;
                        }
                        console.log("plan get")
        
                    }}}
           
        }


    Planimation.prototype = {
    	
    	constructor: Planimation,
        getView: function(){
            return this.app.view;
        },
        initialise:initialise,
        updateWithPlan:updateWithPlan

       
    };
    return Planimation;

})