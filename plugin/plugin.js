// Tree Globals
var stateCounter, graph, treemap, svg, duration, treeData, treeHeight, goTree = true, heurMax = 0;
var root, d3, zoom, viewerWidth, viewerHeight;

// Heuristic globals
var hSim, svgID, heursvg, svgCount=1, actions, fluents, fluentPreconditions = {}, formattedActions, heurdata;

// Planimation Global
var app;
var app_width;
var app_height;
var app_stage;

function launchViz(){
    window.new_tab('Viz2.0', function(editor_name){
      $('#' +editor_name).html('<div style = "margin:13px 26px;text-align:center"><h2>Heuristic Search Vizualization</h2>' +
      //'<button onclick="zoomIn()" style="float:right;margin-left:16px" id ="ZoomIn">ZoomIn</button>' +
      //'<button onclick="zoomOut()" style="float:right;margin-left:16px" id ="ZoomOut">ZoomOut</button>' +
      '<div class="row">' +
      '  <div id="statespace" class="col-md-9"></div>' +
      '  <div id="statepanel" class="col-md-3">' +
      '    <div id="statebuttons" style="padding:10px">' +
      '      <button onclick="show_hadd()" type="button" class="btn btn-info">hadd</button>' +
      '      <button onclick="compute_plan()" type="button" class="btn btn-success">Plan</button>' +
      '    </div>' +
      '    <div id="statename" style="clear:both">State</div>' +
      '    <div id="statedetails" style="padding:10px"></div>' +
      '    <div id="planimation" style="padding:10px"></div>'+
      '  </div>' +
      '</div>' +
      '<node circle style ="fill:black;stroke:black;stroke-width:3px;></node circle>' +
      '<p id="hv-output"></p>');
      initialisePlanimation(editor_name)
    });
    makeTree();

    
    
}

// Generates the SVG object, and loads the tree data into a d3 style tree
function makeTree() {
    // Prevents the creation of more than one tree
    if (goTree){
        // Set the dimensions and margins of the diagram
        var margin = {top: 20, right: 30, bottom: 30, left: 90};
        var width = $('#statespace').width() - margin.left - margin.right;
        var height = 700 - margin.top - margin.bottom;

        // Initialize d3 zoom
        zoom = d3.zoom().on('zoom', function() {
                    svg.attr('transform', d3.event.transform);
                    })

        // Declaring the SVG object, init attributes
        svg = d3.select("#statespace").append("svg")
            .attr("width", "100%")
            .attr("height", height + margin.top + margin.bottom)
            .style("background-color", "white")
            .call(zoom)
            .on("dblclick.zoom", null)
            .append("g")
            .attr("transform", "translate("+ margin.left + "," + margin.top + ")")
            .append("g")
            .attr("transform", "translate("+ (width / 2) + "," + margin.top + ")");

        // create the tooltip
        d3.select("#statespace")
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "2px")
            .style("border-radius", "5px")
            .style("padding", "5px")

        // Num and duration of animations
        duration = 750;

        // declares a tree layout and assigns the size
        treemap = d3.tree().size([height, width]);

        // Assigns parent, children, height, depth
        root = d3.hierarchy(treeData, function(d) { return d.children; });
        root.x0 = height / 2;
        root.y0 = 0;

        // Loads children of root
        loadData(root, function(result) {
            convertNode(result);
            update(result);
            // Preventing multiple trees
            goTree = false;
        });
  }
}

// d3 zoom in
function zoomIn(){
  zoom.scaleBy(svg.transition().duration(750), 1.3);
}

// d3 zoom out
function zoomOut(){
  zoom.scaleBy(svg, 1 / 1.3);
}

// Loads children of a supplied node
function loadData(node, callback) {
    if(!node.loadedChildren) {
        const state = node.data.state;
        getChildStates(state)
        .then(data => {
            for (let i = 0; i < data['states'].length; i++) {
                if(node.data.children) {
                    // Create data
                    const newName = "State " + stateCounter;
                    stateCounter += 1;
                    const newState = {"name":newName, "children":[], "state":data.states[i], "strState":data.stringStates[i], "precondition":data.actions[i].toString(), "loadedChildren":false};
                    node.data.children.push(newState);
                }
            }
            node.loadedChildren = true;
            // Call the callback function with the node that contains
            // the newly loaded children
            callback(node);
        });
    }
}

// Converts the node to d3 tree form using d3.hierarchy
// and initializes other properties
function convertNode(node) {
    // Get children of node
    const allChildren = node.data.children;
    // Var to hold formatted children
    const newHierarchyChildren = [];

    allChildren.forEach((child) => {
        const newNode = d3.hierarchy(child); // create a node
        newNode.depth = node.depth + 1; // update depth depends on parent
        newNode.height = node.height;
        newNode.parent = node; // set parent
        newNode.id = String(child.id); // set uniq id

        newHierarchyChildren.push(newNode);
    });

    // Add to parent's children array and collapse
    node.children = newHierarchyChildren;
    node._children = newHierarchyChildren;
}

function nodeSelected(d) {
    window.current_state_node = d;
    $('#statename').text(d.data.name+" - "+d.data.precondition);
    $('#statedetails').html('<pre style="text-align: left">'+d.data.strState.sort().join('\n')+'</pre>');
}

function getNodeActions(d){

    if (d.data.name =="root"){
        return ""
    }
    return  getNodeActions(d.parent) + "("+ d.data.precondition.replace(/[(),]/g, ' ').replace(/ +(?= )/g,'').trim()+")"

}



function nodeChildrenToggled(d, cb=null) {
    if (d3.event && d3.event.defaultPrevented) return;

    if(!d.loadedChildren && !d.children) {
        // Load children, expand
        loadData(d, result => {
            convertNode(d);
            d.children = d._children;
            d._children = null;
            update(d);
            if (cb)
                cb(d);
        });
        // Compute the heuristic value of this node
        graph = makeGraph(d);
        heurdata = generateHeuristicGraphData(graph);
        d.data.heuristic_value = autoUpdate(graph, true, false);
        heurMax = Math.max(d.data.heuristic_value, heurMax);
    }
    else if (d.children) {
        d._children = d.children;
        d.children = null;
        update(d);
        if (cb)
            cb(d);
    } else {
        d.children = d._children;
        d._children = null;
        update(d);
        if (cb)
            cb(d);
    }
}

function infix(orig) {
    return '(' + orig.split('(')[0] + ' ' + orig.split('(')[1].split(')')[0].split(',').join(' ') + ')'
}

function normalized_check(first, second) {
    return first.replaceAll(' ', '').toLowerCase() == second.replaceAll(' ', '').toLowerCase();
}

function successor_node(src, act) {
    for (var i=0; i<src.children.length; i++) {
        if (normalized_check(infix(src.children[i].data.precondition), act))
            return src.children[i];
    }
}

function compute_plan() {
    var fluents = [];
    window.current_state_node.data.strState.forEach(f => {
        fluents.push(infix(f));
    });

    var new_prob = '';
    var old_prob = window.heuristicVizProblem;

    var open_brackets = 0;

    for (var i=0; i<old_prob.length; i++) {
        
        if (old_prob.substring(i, i+5) == ":init") {
            new_prob += ":init " + fluents.join('\n') + ')\n';
            open_brackets = 1;
        }

        if (open_brackets) {
            if (old_prob[i] == '(')
                open_brackets += 1;
            else if (old_prob[i] == ')')
                open_brackets -= 1
        } else {
            new_prob += old_prob[i];
        }
    }

    $.ajax( {url: "https://solver.planning.domains/solve-and-validate",
        type: "POST",
        contentType: 'application/json',
        data: JSON.stringify({"domain": window.heuristicVizDomain,
                              "problem": new_prob})})
            .done(function (res) {
                if (res['status'] === 'ok') {
                    // toastr.success('Plan found!');
                    var index = 0;
                    function _expand(cur_node) {
                        if (index < res.result.plan.length) {
                            // console.log(res.result.plan[index].name);
                            // console.log('i='+index);
                            if (cur_node.children == null) {
                                nodeChildrenToggled(cur_node, function(d) {
                                    var act = res.result.plan[index].name
                                    index += 1;
                                    setTimeout(_expand, 300, successor_node(cur_node, act));
                                });
                            }
                        }
                    }
                    _expand(window.current_state_node);
                } else {
                    toastr.error('Planning failed.');
                }
            }
        );
}



// Single click on node: update the info shown for a node
function click(d){
    nodeSelected(d);

    var plan=getNodeActions(d);
    var domText = window.ace.edit($('#domainPlanimationSelection').find(':selected').val()).getSession().getValue();
    var probText = window.ace.edit($('#problemPlanimationSelection').find(':selected').val()).getSession().getValue();
    var animateText = window.ace.edit($('#animateSelection').find(':selected').val()).getSession().getValue();
    var formData = new FormData();
    formData.append("domain", domText);
    formData.append("problem", probText);
    formData.append("animation", animateText);
    formData.append("plan", plan);

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
                // toastr.success('Planimation Update found!');
               
                updatePlaimation(vfg,d.data.name);

            }}}
             
    // $.ajax( {url: "https://planimation.planning.domains/upload/pddl",
    // type: "POST",
    // contentType: "multipart/form-data",
    // data: formData})
    //     .done(function (res) {
    //         if (res['status'] === 'ok') {
    //             toastr.success('Planimation Update found!');
    //             console.log(res)
    //             var vfg=JSON.parse(res.responseText);
    //             console.log(vfg)
    //             updatePlaimation(vfg,d.data.name);

    //         } else {
    //             toastr.error('Planimation failed.');
    //         }
    //     }
    // );

}

function updatePlaimation(vfg,nodeName) {


    if (nodeName != "root"){
        app_stage = vfg.visualStages[vfg.visualStages.length-1].visualSprites;
    }
    else{
        app_stage = vfg.visualStages[0].visualSprites;
    }
   
}

// Double click on node: expand/collapse children
function dblclick(d) {
    nodeChildrenToggled(d);
}

// Called when the hadd button is clicked
function show_hadd() {
    startHeuristicViz(window.current_state_node);
}

// Collapses the node and all it's children
function collapse(d) {
  if(d.children) {
    d._children = d.children
    d._children.forEach(collapse)
    d.children = null
  }
}

// Updates the tree: drawing links, nodes, and tooltip
function update(source){
    //Assigns the x and y position for the nodes
    var treeData = treemap(root);
    // Compute the new tree layout.
    var nodes = treeData.descendants(),
        links = treeData.descendants().slice(1);

    // Normalize for fixed-depth.
    nodes.forEach(function(d) {
        if (d.depth > treeHeight)
        treeHeight = d.depth;
        d.y = d.depth * 130;
        if (d.data.name === "goal state") {
            while (d !== root) {
                d.path = true;
                d = d.parent;
            }
        }
    });

    // ****************** Nodes section ***************************
    var Tooltip = d3.select(".tooltip");

    // Three function that change the tooltip when user hover / move / leave a cell
    var mouseover = function(d) {
        Tooltip
            .style("opacity", 1)
        d3.select(this)
            .style("stroke", "black")
            .style("opacity", 1);
        hoveredOverStateInStatespace(d);
    }
    var mousemove = function(d) {
        Tooltip
            .html(formatTooltip(d))
            .style("left", (d3.event.pageX - 400) + "px")
            .style("top", (d3.event.pageY - 50) + "px");
    }
    var mouseleave = function(d) {
        Tooltip
            .style("opacity", 0)
        d3.select(this)
            .style("stroke", "none");
    }

    // Update the nodes...
    var node = svg.selectAll('g.node')
        .data(nodes, function(d) {return d.data.name; })

    // Enter any new modes at the parent's previous position.
    var nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr("transform", function(d) {
            return "translate(" + source.y0 + "," + source.x0 + ")";
        })
        .on('click', click)
        .on('dblclick',dblclick)
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave);

    // Add Circle for the nodes
    nodeEnter.append('circle')
        .attr('class', 'node')
        .attr('r', 1e-6)
        .style("fill", "lightsteelblue");

    // Add labels for the nodes
    /*
    nodeEnter.append('text')
        .attr("dy", ".35em")
        .attr("x", function(d) {
            return d.children || d._children ? -13 : 13;
        })
        .attr("text-anchor", function(d) {
            return d.children || d._children ? "end" : "start";
        })
        .text(function(d) { return d.data.name; });
    */

    // UPDATE
    var nodeUpdate = nodeEnter.merge(node);

    // Transition to the proper position for the node
    nodeUpdate.transition()
        .duration(duration)
        .attr("transform", function(d) {
            return "translate(" + d.y + "," + d.x + ")";
        });

    // Update the node attributes and style
    nodeUpdate.select('circle.node')
        .attr('r', 10)
        .style("fill", function(d) {
            return (d.data.heuristic_value == 0) ? '#FFD700' : d3.interpolateHsl('red','blue')(d.data.heuristic_value / heurMax);
        })
        .attr('cursor', 'pointer');


    // Remove any exiting nodes
    var nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", function(d) {
            return "translate(" + source.y + "," + source.x + ")";
        })
        .remove();

    // On exit reduce the node circles size to 0
    nodeExit.select('circle')
        .attr('r', 1e-6);

    // On exit reduce the opacity of text labels
    nodeExit.select('text')
        .style('fill-opacity', 1e-6);

    // ****************** links section ***************************

    // Update the links...
    var link = svg.selectAll('path.link')
        .data(links, function(d) { return d.data.name; });

    // Enter any new links at the parent's previous position.
    var linkEnter = link.enter().insert('path', "g")
        .attr("class", "link")
        .attr('d', function(d){
            var o = {x: source.x0, y: source.y0}
            return diagonal(o, o)})
        .style("fill", "none")
        .style("stroke", "#ccc")
        .style("stroke-width", "2px");

    // UPDATE
    var linkUpdate = linkEnter.merge(link);

    // Transition back to the parent element position
    linkUpdate.transition()
        .duration(duration)
        .attr('d', function(d){ return diagonal(d, d.parent) });

    // Remove any exiting links
    var linkExit = link.exit().transition()
        .duration(duration)
        .attr('d', function(d) {
            var o = {x: source.x, y: source.y}
            return diagonal(o, o)
        })
        .remove();

    // Store the old positions for transition.
    nodes.forEach(function(d){
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

// Creates a curved (diagonal) path from parent to the child nodes
function diagonal(s, d) {
    path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
                ${(s.y + d.y) / 2} ${d.x},
                ${d.y} ${d.x}`
    return path
}

// Returns a string of formatted html
function formatTooltip(node) {
    if (node.data.heuristic_value === undefined)
        node.data.heuristic_value = '??';
    return "h="+node.data.heuristic_value;
}

function hoveredOverStateInStatespace(d) {
    console.log("Hovered over state ", d, " in the state space.");
}

/*
--------------------------------------------------------------------------------
                                END OF TREE CODE
--------------------------------------------------------------------------------
*/

/*
--------------------------------------------------------------------------------
                                START OF HEURISTIC GRAPH CODE
--------------------------------------------------------------------------------
*/

// Make graph function, returns false if the problem is not a legal version for the heuristic
function makeGraph(state){
    var graph = new Map();
    let index = 1;
    
    fluents = getGroundedFluents();
    actions = getGroundedActions();

    if(actions == false) {
        // Precondition has a negative, cannot compute heuristic, return
        return false;
    }

    generateFluentNodes(state, graph, index);
    generateActionNodes(graph, index);
    generateGoalNode(graph, index);

    return graph;
}

function formatActions(actions) {
    formattedActions = [];
    Array.from(actions.preconditions.keys()).forEach(action => {
        let newAction = {"action":action, "preconditions":[], "effects":[], "value":0};
        actions.preconditions.get(action).forEach(pcond => {
            newAction.preconditions.push(pcond);
        });
        actions['effects'].get(action).forEach(effect => {
            // fluentPreconditions[effect].push(action);
            newAction.effects.push(effect);
        });
        formattedActions.push(newAction);
    })
    return formattedActions;
}

function generateFluentNodes(state, graph, index) {
    // Have to check if this fluent is in the state to initialize (do this after)
    fluents.forEach(fluent => {
        // fluent.preconditions = fluentPreconditions[fluent.]
        if(state.data.strState.includes(fluent)) {
            graph.set(fluent, {
                'type':'fluent',
                'value':0,
                'index':index,
            });
        } else {
            graph.set(fluent, {
                'type':'fluent',
                'value':Number.POSITIVE_INFINITY,
                'index':index,
            });
        }
        index += 1;
    });
}

function generateActionNodes(graph, index) {
    Array.from(actions.keys()).forEach(action => {
        actionData = actions.get(action);
        graph.set(action, {
            'type':'action',
            'value':Number.POSITIVE_INFINITY,
            'preconditions': actionData.get('preconditions'),
            'effects': actionData.get('effects'),
            'index': index
        });
        index += 1;
    });
}

function generateGoalNode(graph, index) {
    goalNode = {
        'type' : 'goal' ,
        'object': 'goal',
        'value':Number.POSITIVE_INFINITY,
        'preconditions': convertStateToArray(getGoalState()),
        'effects': null,
        'index': index
    }
    graph.set('goal', goalNode);
}

function generateHeuristicGraphData(graph) {
    var data = {"nodes":[], "links":[]};

    // Populating data with fluents
    fluents.forEach(fluent => {
        data.nodes.push({"id":fluent, "name":fluent, "type":"fluent", "value":graph.get(fluent).value});
        fluentPreconditions[fluent] = [];
    });

    // Populating data with actions, and links with their respective connections 
    // based on the actions preconditions and effects. 
    Array.from(actions.keys()).forEach(action => {
        data.nodes.push({"id":action, "name":action, "type":"action", "value":graph.get(action).value});
        actions.get(action).get('preconditions').forEach(pcond => {
            if(fluents.has(pcond)) {
                data.links.push({"source":pcond, "target":action});   
            }
        });
        actions.get(action).get('effects').forEach(effect => {
            if(fluents.has(effect)) {
                fluentPreconditions[effect].push(action);
                data.links.push({"source":action, "target":effect});
            }
        });
    });

    // Adding goal node
    data.nodes.push({"id":'goal', "name":'goal', "type":"goal", "value":graph.get('goal').value});

    // Adding goal links
    graph.get('goal').preconditions.forEach(goalPrecondtion => {
        data.links.push({"source":goalPrecondtion, "target":'goal'});
    });

    return data;
}

// Update node labels to reflect value change
function updateLabels() {
    // Updates labels to reflect changes in value
    heursvg.selectAll("text").data(heurdata.nodes)
        .transition().duration(500)
        .text((d) => d.name + " Value: " + graph.get(d.name).value)
        .attr('dx', 3)
}

// Launches the heuristic visualizer tab, formats data, and initiates the visualization
function startHeuristicViz(node) {

    graph = makeGraph(node);

    if(graph == false) {
        // Cannot make the heuristic graph, throw err
        window.toastr.error("Problem needs to be in STRIPS format for heuristic visualization.");
        return;
    }

    data = generateHeuristicGraphData(graph);
    heurdata = data;

    // Make a new tab for the viz
    window.new_tab('Node', function(editor_name){
        var tmp = '';
        tmp += '<div style = "margin:13px 7px;text-align:center">';
        tmp += '  <h2>Heuristic Visualization</h2>';
        tmp += '  <div class="row">';
        tmp += '    <div id="heuristic" class="col-md-9"></div>';
        tmp += '    <div id="heuristicbuttons" style="padding:10px" class="col-md-3">';
        tmp += '      <button onclick="autoUpdate(graph, true, true)" type="button" class="btn btn-success">Compute</button>';
        tmp += '    </div>';
        tmp += '  </div>';
        tmp += '</div>';
        $('#' +editor_name).html(tmp);
        svgID = editor_name;
    });

    // Holds the nodes, the links, and the labels
    var node, link, text;

    // Set the dimensions and margins of the diagram
    // var margin = {top: 20, right: 400, bottom: 30, left: 400},
    // width = $('#' + svgID).width() - margin.right - margin.left;
    // height = 1000 - margin.top - margin.bottom;
    // Set the dimensions and margins of the diagram
    var margin = {top: 20, right: 30, bottom: 30, left: 90};
    var width = $('#statespace').width() - margin.left - margin.right;
    var height = 700 - margin.top - margin.bottom;

    // Init SVG object
    heursvg = d3.select('#' + svgID)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("background-color", "white")
        .style("margin-left", "30px")
        .on("dblclick.zoom", null)
        .call(d3.zoom().on("zoom", function () {
            heursvg.attr("transform", d3.event.transform)
        }))
        .append("g")
        .attr("transform","translate(" + margin.left + "," + margin.top + ")");

    // Initializing the arrow head for links
    heursvg.append('defs')
        .append('marker')
        .attr('id','arrowhead')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 14)
        .attr('xoverflow','visible')
        .append('svg:path')
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
        .attr('fill', '#bc5090')
        .style('stroke','none');

    // Initializing the force that gets applied to the network
    hSim = d3.forceSimulation(data.nodes)              // Force algorithm is applied to data.nodes
        .force("link", (d3.forceLink()                                // This force provides links between nodes
            .id(function(d, i) { return d.id; })
            .distance(300)
            .strength(1)                    // This provide  the id of a node                                // and this the list of links
        ))
        .force("charge", d3.forceManyBody().strength(-500))          // This adds repulsion between nodes. Play with the -400 for the repulsion strength
        .force("center", d3.forceCenter(width / 2, height / 2))      // This force attracts nodes to the center of the svg area
        .on("end", ticked);

    // Initialize the D3 graph with generated data
    link = heursvg.selectAll(".link")
        .data(data.links)
        .enter()
        .append("line")
        .attr("class", "link")
        .attr("stroke", "#999")
        .attr("stroke-width", "1px")
        .attr("marker-end", "url(#arrowhead)")

    link.append("title").text(d => d.type);

    text = heursvg.selectAll("text")
        .data(data.nodes)
        .enter()
        .append("g")
        .append("text")
        .text((d) => {
            return d.name + " Value: " + d.value;
        })
        .attr('dy', -18)
        .attr("text-anchor", "middle");

    node = heursvg.selectAll('.node')
        .data(data.nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('fixed', true)
        .attr('stroke-width', '2')
        .on("dblclick", dclk)
        .on("click", clk)
        .on("mouseover", highlight)
        .on("mouseleave", removeHighlight)
        .call(
            d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended)
        );

    node.append('circle')
        .attr('r', 10)
        .style('fill', (d,i) => getColor(d))

    node.append('title')
        .text((d) => d.id)

    hSim
        .nodes(data.nodes)
        .on('tick', ticked);

    hSim.force('link')
        .links(data.links);

    // This function is run at each iteration of the force algorithm, updating the node, link, and text positions.
    function ticked() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node
            .attr("transform", (d) => "translate(" + d.x + ", " + d.y + ")");

        text
            .attr("transform", (d) => "translate(" + d.x + ", " + d.y + ")");
    }

    function dragstarted(d) {
        if (!d3.event.active) hSim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        d.fixed = false;
      }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        d.fixed = true;
    }

    // Double click
    function dclk(d) {
        d.fixed = false;
    }

    // Click
    function clk(d) {
        // Update node on click
        updateHeuristicNode(d);
    }

    // Returns node color based on type / being the goal node
    function getColor(d) {
        if (d.name == "goal") {
            return "#ffa600";
        } else if (d.type == "action") {
            return "#ff6361";
        } else {
            return "#003f5c";
        }
    }

    // Highlights node and all of its predecessors
    function highlight(d) {
        d3.select(this).style('opacity', 0.9);
        node.style("stroke", function(o) {
            // d is this
            // o is other
            if(d.type == "goal") {
                if(graph.get('goal').preconditions.includes(o.id) || d.id == o.id) {
                    // o is precondition
                    return '#a7440f';
                } else {
                    return 'none';
                }
            } else if(d.type == "action") {
                if(actions.get(d.id).get('preconditions').includes(o.id) || d.id == o.id) {
                    // o is precondition
                    return '#a7440f';
                } else {
                    return 'none';
                }
            } else {
                if(fluentPreconditions[d.id].includes(o.id) || d.id == o.id) {
                    // o is precondition
                    return '#a7440f';
                } else {
                    return 'none';
                }
            }
        });

        node.style("opacity", function(o) {
            if(d.type == "goal") {
                if(graph.get('goal').preconditions.includes(o.id) || d.id == o.id) {
                    // o is precondition
                    return 1;
                } else {
                    return 0.5;
                }
            } else if(d.type == "action") {
                if(actions.get(d.id).get('preconditions').includes(o.id) || d.id == o.id) {
                    // o is precondition
                    return 1;
                } else {
                    return 0.5;
                }
            } else {
                if(fluentPreconditions[d.id].includes(o.id) || d.id == o.id) {
                    // o is precondition
                    return 1;
                } else {
                    return 0.5;
                }
            }
        });

        text.style('opacity', function(o) {
            if(d.type == "goal") {
                if(graph.get('goal').preconditions.includes(o.id) || d.id == o.id) {
                    // o is precondition
                    return 1;
                } else {
                    return 0.5;
                }
            } else if(d.type == "action") {
                if(actions.get(d.id).get('preconditions').includes(o.id) || d.id == o.id) {
                    // o is precondition
                    return 1;
                } else {
                    return 0.5;
                }
            } else {
                if(fluentPreconditions[d.id].includes(o.id) || d.id == o.id) {
                    // o is precondition
                    return 1;
                } else {
                    return 0.5;
                }
            }
        });

        link
            .style('stroke', function (o) {
                if(o.target.id == d.id) {
                    return '#69b3b2';
                } else {
                    return '#b8b8b8';
                }
            })
            .style('opacity', function(o) {
                if(o.target.id == d.id) {
                    return 1;
                } else {
                    return 0.5;
                }
            });
    }

    // Removes black highlight from nodes and their predecessors
    function removeHighlight(d) {
        node.style("stroke", "none");
        d3.select(this).style('opacity', 1);
        link
            .style("stroke", "#999")
            .style("stroke-width", "1px")
            .style('opacity', 1);
        text.style('opacity', 1);
        node.style('opacity', 1);
    }

    // Updates value of node and reflects the change in the visualization
    function updateHeuristicNode(d) {
        // Update clicked node
        var result = updateValue(graph, d.id, true);

        // If an update occured
        if(result[1]) {
            window.toastr.success("Value updated!");
            // Update data variable to reflect the update
            data.nodes[d.index].value = graph.get(d.id).value;
            // Redraw labels
            updateLabels();
        } else {
            window.toastr.info("No update occured!");
        }
    }

}

// Pauses force simulation (needs to be a global function due to html buton)
function freeze() {
    hSim.stop();
}

// Unpacks action name
function getActionName(name) {
    var n = name[0] + " ";
    for(const v in name[1]) {
        n += v + " ";
    }
    return n;
}

function getUpdatedFluentValue(node, graph){
    var adders = getAdders(node, graph);
    var lowestAdder =  Number.POSITIVE_INFINITY;
    //var currentSum = 0;
    for (adder in adders){
        currentAdder = graph.get(adders[adder]).value;
        //currentSum = getSumOfPreconditions(adder, graph);
        if (lowestAdder > currentAdder){
            lowestAdder = currentAdder;
        }
    }
    return lowestAdder;
}

function getSumOfPreconditions(actionNode, graph) {
    var sum = 0;
    graph.get(actionNode).preconditions.forEach(precondition => {
        // Check if the precondition is in the graph (tarski ignores irrelevant ones)
        if(fluents.has(precondition)) {
            sum += graph.get(precondition).value;
            console.log(graph.get(precondition).value);
        }
    });
    return sum;
}

// For HMAX
// function getMaxPrecondition(actionNode, graph){
//     maxPreconditon = Number.NEGATIVE_INFINITY;
//     for (index in actionNode.preconditionIndices){
//         currentIndex = actionNode.preconditionIndices[index];
//         if(graph[currentIndex].value > maxPreconditon){
//             maxPreconditon = graph[currentIndex].value;
//         }
//     }
//     return maxPreconditon;
// }

function getAdders(fluentNode, graph){
    adders = [];
    for(let node of graph.keys()) {
        if(graph.get(node).type == 'action') {
            if(graph.get(node).effects.includes(fluentNode)) {
                adders.push(node);
            }
        }
    }
    return adders;
}

function updateValue(graph, node, hAdd){
    var update = false;
    if (graph.get(node).type == 'fluent'){
        updateVal = getUpdatedFluentValue(node, graph);
    }
    else{
        if (hAdd){
            updateVal= 1 + getSumOfPreconditions(node, graph);

        }
        else{
            updateVal= 1 + getMaxPrecondition(node, graph);
        }
        // Goal node should not have an action cost
        if (node == 'goal')
            updateVal -= 1;

    }
    if (updateVal < graph.get(node).value){
        graph.get(node).value = updateVal
        update = true;
    }
    return [graph, update];
}

function autoUpdate(graph, hAdd, hUpdate=true) {
    var update = true;
    var updateData;
    while (update){
        update = false;
        for(let node of graph.keys()) {
            updateData = updateValue(graph, node, hAdd);
            graph = updateData[0];
            if (hUpdate)
                heurdata.nodes[graph.get(node).index].value = graph.get(node).value;
            if (updateData[1] == true)
                update = true;
        }
    }
    if (hUpdate)
        updateLabels();
    return graph.get('goal').value;
}

/*
--------------------------------------------------------------------------------
                                START OF Viz and Planimation 
--------------------------------------------------------------------------------
*/
var PLANIMATION_MODEL = `
<!-- Choose Files Modal -->
<div class="modal fade" id="chooseFilesPlanimationModel" tabindex="-1" role="dialog" aria-labelledby="chooseFilesModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
        <h4 class="modal-title" style="display:inline" id="chooseFilesModalLabel">Planimate your plan</h4> | 
        <a onclick="$('#planimationhelpModal').modal(true)">  more info  <span class="glyphicon glyphicon-question-sign" style="cursor: pointer; top:7px !important; left:7px;font-size:25px;"aria-hidden="true"></span></a>
    
      </div>
      <div class="modal-body">
        <form class="form-horizontal left" role="form">
          <div class="form-group">
            <label for="domainPlanimationSelection" class="col-sm-4 control-label">Domain</label>
            <div class="col-sm-8">
              <select id="domainPlanimationSelection" class="form-control file-selection">
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="problemPlanimationSelection" class="col-sm-4 control-label">Problem</label>
            <div class="col-sm-8">
              <select id="problemPlanimationSelection" class="form-control file-selection">
              </select>
            </div>
          </div>
           <div class="form-group">
            <label for="animateSelection" class="col-sm-4 control-label">Animation</label>
            <div class="col-sm-8">
              <select id="animateSelection" class="form-control file-selection">
              </select>
            </div>
          </div>
       
        </form>

        <button id="filesChosenButton" class="btn-lg btn-success" type="button" onclick="filesChosen()">Planimate</button>
    


        <div class="form-group" style="display:inline-block">
            

         

        <div id="plannerURLInput" class="input-group">
          <input type="radio" id="urlradio" name="planradio"  onchange="on_change(this)" checked style="display:flex;position:relative;top:-10px;margin-left:15px;margin-right:-10px;">
          <span class="input-group-addon" id="customPlannerLabel">Custom Planner URL</span>
          <input id="plannerPlanimationURL" type="text" class="form-control" aria-describedby="customPlannerLabel" placeholder="http://solver.planning.domains/solve">
        </div>

<br/>
            <div class="col-sm-4" style="margin-bottom:5px;">
            <input type="radio" id="planradio" name="planradio" onchange="on_change(this)" style="margin-right:10px">
            <label>Upload Plan</label>
            </div>

            <div class="col-sm-4" style="position:relative;top:-5px;left:-6px;">
              <select id="planSelection" style="display:none" class="form-control file-selection">
              </select>
            </div>
          
      </div>
      <br/>

      <div class="modal-footer"  >
        <a href="http://planimation.planning.domains/" style="float:left" target="_blank">Try Planimation Web App</a>
        <button type="button" class="btn btn-default"  data-dismiss="modal">Cancel</button>
      </div>
    </div>
  </div>
</div>
`


function choosePlanimationFiles(type) {

    window.action_type = type
    window.file_choosers[type].showChoice();
  
    var domain_option_list = "";
    var problem_option_list = "";
    var animate_option_list = "";
    var plan_option_list = "";
    var unknown_option_list = "";
    var hr_line = "<option disabled=\"disabled\">---------</option>\n";
    var setDom = false;
    var setProb = false;
    var setAnimate = false;
    var setPlan = false;
  
    for (var i = 0; i < window.pddl_files.length; i++) {
      if ($.inArray(window.pddl_files[i], window.closed_editors) == -1) {
        if (window.pddl_files[i] == window.last_domain)
          setDom = true;
        if (window.pddl_files[i] == window.last_problem)
          setProb = true;
        if (window.pddl_files[i] == window.last_animate)
          setAnimate = true;
        if (window.pddl_files[i] == window.last_plan)
          setPlan = true;
  
        var option = "<option value=\"" + window.pddl_files[i] + "\">" + $('#tab-' + window.pddl_files[i]).text() + "</option>\n";
        var file_text = window.ace.edit(window.pddl_files[i]).getSession().getValue();
        if (file_text.indexOf('(domain') !== -1)
          domain_option_list += option;
        else if (file_text.indexOf('(problem') !== -1)
          problem_option_list += option;
        else if (file_text.indexOf('(animation') !== -1)
          animate_option_list += option;
        else
          unknown_option_list += option;
      }
    }
  
    var domain_list = domain_option_list + hr_line + unknown_option_list + hr_line + problem_option_list;
    var problem_list = problem_option_list + hr_line + unknown_option_list + hr_line + domain_option_list;
    var animate_list = animate_option_list + hr_line + unknown_option_list + hr_line + animate_option_list;
    var plan_list = plan_option_list + hr_line + unknown_option_list + hr_line + plan_option_list;
    $('#domainPlanimationSelection').html(domain_list);
    $('#problemPlanimationSelection').html(problem_list);
    $('#animateSelection').html(animate_list);
    $('#planSelection').html(plan_list);
    if (setDom)
      $('#domainPlanimationSelection').val(window.last_domain);
    if (setProb)
      $('#problemPlanimationSelection').val(window.last_problem);
    if (setAnimate)
      $('#animateSelection').val(window.last_animate);
    if (setPlan)
      $('#planSelection').val(window.last_plan);
    $('#chooseFilesPlanimationModel').modal('toggle');
  }
  
  
  
function on_change(event) {
    if (event.id == "planradio") {
      $('#planSelection').show();
    } else {
      $('#planSelection').hide();
    }
  
  }


function initialisePlanimation(editor_name){
    console.log("Run Second")
    var html = '';

    html += `
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pixi.js/5.1.3/pixi.min.js"></script>
    <script type="text/javascript">
        var domText = window.ace.edit($('#domainPlanimationSelection').find(':selected').val()).getSession().getValue();
        var probText = window.ace.edit($('#problemPlanimationSelection').find(':selected').val()).getSession().getValue();
        var animateText = window.ace.edit($('#animateSelection').find(':selected').val()).getSession().getValue();
        var formData = new FormData();
        formData.append("domain", domText);
        formData.append("problem", probText);
        formData.append("animation", animateText);
        // formData.append("plan", plan);
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
                  // The request has been completed successfully
              // Set the canvas size
            let width = 250, height = 250;
            app_width=250, app_height=250
            //Aliases
            let Application = PIXI.Application,
                loader = PIXI.loader,
                resources = PIXI.loader.resources,
                Sprite = PIXI.Sprite;

            //Create a Pixi Application
            app = new Application({
                width: width,
                height: height,
                antialias: true,
                transparent: true,
                resolution: 1
            }
            );

            // The following two line is to change the canvas origin from top left to bottom left.
            app.stage.position.y = app.renderer.height / app.renderer.resolution;
            app.stage.scale.y = -1;

            //Add the canvas that Pixi automatically created for you to the HTML document
          
            document.getElementById("planimation").appendChild(app.view);
      
            var vfg=JSON.parse(xhr.responseText);
            app_stage=vfg.visualStages[0].visualSprites;
            // Code to get the image texture from VFG File
            var base64imgs = []
            for (var i = 0; i < vfg.imageTable.m_keys.length; i++) {
                var obj = {}
                obj.name = vfg.imageTable.m_keys[i];
                obj.url = "data:image/png;base64," + vfg.imageTable.m_values[i];
                base64imgs.push(obj)
            }

            //load based64 images and run the =setup function when it's done
            loader
                .add(base64imgs)
                .on("progress", loadProgressHandler)
                .load(setup);


            //This setup function will run when the image has loaded
            function setup() {
                console.log("All files loaded");
                currentStage = 0
                entStage = vfg.visualStages.length;

                // get all the sprites and it's attributes for the current stage.
                sprites = vfg.visualStages[currentStage].visualSprites;

                // Add all the sprites to the canvas
                for (var i = 0; i < sprites.length; i++) {
                    if (sprites[i].showname) {
                        app.stage.addChild(getSpriteWithName(sprites[i]));
                    } else {
                        app.stage.addChild(getSprite(sprites[i]));
                    }
                    // sort the children based on their zIndex
                    app.stage.children.sort((itemA, itemB) => itemA.zIndex - itemB.zIndex);

                }

                //Capture the keyboard arrow keys
                let left = keyboard("ArrowLeft"),
                    right = keyboard("ArrowRight");
                var updated = false;

                //Left arrow key press method
                left.press = () => {
                    if (currentStage > 0 && updated === false) {
                        currentStage = currentStage - 1;
                        updated = true
                    }
                };
                //Left arrow key release method
                left.release = () => {
                    updated = false;
                };
                //Right
                right.press = () => {
                    if (currentStage < entStage - 1 && updated === false) {
                        currentStage = currentStage + 1;
                        updated = true
                    }
                };
                right.release = () => {
                    updated = false;
                };

            
                //call update canvas 60 times per second
                app.ticker.add(delta => updateCanvas(delta));

            }

            function getSprite(sprite) {
              textureName = sprite.prefabimage
              var spriteObj = new Sprite(resources[textureName].texture);
              spriteObj.texture.rotate = 8
              spriteObj.name = sprite.name;
              spriteObj.position.set(sprite.minX * width, sprite.minY * width);
              spriteObj.width = (sprite.maxX - sprite.minX) * width;
              spriteObj.height = (sprite.maxY - sprite.minY) * height;
              spriteObj.tint = RGBAToHexA(sprite.color.r, sprite.color.g, sprite.color.b, sprite.color.a);
              spriteObj.zIndex = sprite.depth;
              if ('rotate' in sprite) {
                  spriteObj.anchor.set(0.5, 0.5);
                  spriteObj.rotation = sprite.rotate * Math.PI / 180;
                  spriteObj.position.set(sprite.minX * width + (sprite.maxX - sprite.minX) * width / 2, sprite.minY * width);
              }
              return spriteObj;

          }
          function getSpriteWithName(sprite) {
              // get the image type, block,table,etc
              textureName = sprite.prefabimage

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
              spritWithText = new PIXI.Container();
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

          function updateCanvas(delta) {

              //Update the current game state:
              play(delta);
          }

          // Update the scene based on the new stage information
          function play(delta) {

              sprites = app_stage

              for (var i = 0; i < sprites.length; i++) {
                  // get the previous loaded sprite
                  var spriteUpdate = app.stage.getChildByName(sprites[i].name);
                  // Update the sprite location with new position
                  spriteUpdate.position.set(sprites[i].minX * width, sprites[i].minY * width);

                  // Update the sprite with rotate value
                  if ('rotate' in sprites[i]) {
                      updateRotateSprite(spriteUpdate,sprites[i]);
                  }
              }
          }
          function updateRotateSprite(oldSprite,newSprite){
              oldSprite.anchor.set(0.5, 0.5);
              oldSprite.rotation = newSprite.rotate * Math.PI / 180;
              oldSprite.position.set(newSprite.minX * width + (newSprite.maxX - newSprite.minX) * width / 2,newSprite.minY * width);
          }

          } else {
            // Oh no! There has been an error with the request!
          }
        }
        }


        // Progress function, we may use it in future
        function loadProgressHandler(loader, resource) {

//Display the file url currently being loaded
console.log("loading: " + resource.url);

//Display the percentage of files currently loaded
console.log("progress: " + loader.progress + "%");

//If you gave your files names as the first argument 
//of the add method, you can access them like this
//console.log("loading: " + resource.name);
}

// Copied from online, used for tracking key board event.
function keyboard(value) {
let key = {};
key.value = value;
key.isDown = false;
key.isUp = true;
key.press = undefined;
key.release = undefined;
//The downHandler
key.downHandler = event => {
    if (event.key === key.value) {
        if (key.isUp && key.press) key.press();
        key.isDown = true;
        key.isUp = false;
        event.preventDefault();
    }
};

//The upHandler
key.upHandler = event => {
    if (event.key === key.value) {
        if (key.isDown && key.release) key.release();
        key.isDown = false;
        key.isUp = true;
        event.preventDefault();
    }
};

//Attach event listeners
const downListener = key.downHandler.bind(key);
const upListener = key.upHandler.bind(key);

window.addEventListener(
    "keydown", downListener, false
);
window.addEventListener(
    "keyup", upListener, false
);

// Detach event listeners
key.unsubscribe = () => {
    window.removeEventListener("keydown", downListener);
    window.removeEventListener("keyup", upListener);
};

return key;
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

    </script>
       `
    // Pixi code

    $("#"+editor_name).append(html);


}
/*
--------------------------------------------------------------------------------
                                Finish OF Viz and Planimation 
--------------------------------------------------------------------------------
*/



// Called when you click 'Go' on the file chooser
function loadStatespace() {

    // Getting string versions of the selected files
    var domain = window.ace.edit($('#domainPlanimationSelection').find(':selected').val()).getSession().getValue();
    var problem = window.ace.edit($('#problemPlanimationSelection').find(':selected').val()).getSession().getValue();
    var animation = window.ace.edit($('#animateSelection').find(':selected').val()).getSession().getValue();
    window.heuristicVizDomain = domain;
    window.heuristicVizProblem = problem;
    window.heuristicVizAnimation = animation;

    // Lowering the choose file modal menu
    $('#chooseFilesPlanimationModel').modal('toggle');
    $('#plannerURLInput').show();

    // Ground the domain and problem
    ground(domain, problem).then(function(result) {
        treeData = {"name":"root", "children":[], "state":result.state, "strState":result.strState, "precondition":null, "loadedChildren":false};
        stateCounter = 1;
        launchViz();
    });
}

define(function () {
    window.d3_loaded = false;
  return {
      name: "Heuristic Viz with Planimation",
      author: "Caitlin Aspinall, Cam Cunningham & Ellie Sekine",
      email: "16cea5@queensu.com",
      description: "Heuristic Visualization",

      initialize: function() {
        var style = document.createElement('tree');
        style.innerHTML = '.node { cursor:pointer } .node circle { stroke-width:1.5px } .node text { font:10px sans-serif }' +
              'div.tooltip {position:absolute; padding:6px; font:12px sans-serif; background-color:#FFA; border-radius:8px; pointer-events:none; left:0; top:0}';
        var ref = document.querySelector('script');
        ref.parentNode.insertBefore(style, ref);

        // Init grounding
        initializeGrounding();

        // Adds menu button that allows for choosing files
        window.add_menu_button('Viz', 'vizMenuItem', 'glyphicon-tower',"choosePlanimationFiles('viz')");
        window.inject_styles('.viz_display {padding: 20px 0px 0px 40px;}')

        // Register this as a user of the file chooser interface
        window.register_file_chooser('viz',
        {
            showChoice: function() {
                // Button name, Description
                window.setup_file_chooser('Go', 'Display Visualization');
                $('#plannerURLInput').hide();
                window.action_type = 'viz'
                 $('#plannerPlanimationURL').val(window.planimationURL);

            },
            // Called when go is hit
            selectChoice: loadStatespace
        });


      if (!(window.planimationSolverStyled)) {
        $('body').append(PLANIMATION_MODEL);

        window.planimationSolverStyled = true;
      }


        },

        
        disable: function() {
          // This is called whenever the plugin is disabled
          window.toastr.warning("Plug in disabled")
          window.remove_menu_button("vizMenuItem");
        },

        save: function() {
          // Used to save the plugin settings for later
          return {did:window.viz_dom_id};
        },

        load: function(settings) {
          // Restore the plugin settings from a previous save call
          window.viz_dom_id = settings['did'];
        }
  };
});



