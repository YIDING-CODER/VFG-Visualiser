var HVIZ_PLANIMATION_MODEL = `
<!-- Choose Files Modal -->
<div class="modal fade" id="chooseFilesVizPlanimationModel" tabindex="-1" role="dialog" aria-labelledby="chooseFilesModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
        <h4 class="modal-title" style="display:inline" id="chooseFilesModalLabel">Planimate your plan</h4>
      </div>
      <div class="modal-body" style="display:inline-block">
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
            
          
      </div>
      <br/>

    </div>
    <div class="modal-footer"  >
    <a href="http://planimation.planning.domains/" style="float:left" target="_blank">Try Planimation Web App</a>
    <button type="button" class="btn btn-default"  data-dismiss="modal">Cancel</button>
    </div>
  </div>
</div>
`

// To store the planimation window,and currently only support one planimation window
var planimation;

// Called when you click 'Go' on the file chooser
function loadStatespacePlanimation() {

  // Getting string versions of the selected files
  var domain = window.ace.edit($('#domainPlanimationSelection').find(':selected').val()).getSession().getValue();
  var problem = window.ace.edit($('#problemPlanimationSelection').find(':selected').val()).getSession().getValue();
  var animation = window.ace.edit($('#animateSelection').find(':selected').val()).getSession().getValue();
  window.heuristicVizDomain = domain;
  window.heuristicVizProblem = problem;
  window.heuristicVizAnimation = animation;

  // Lowering the choose file modal menu
  $('#chooseFilesVizPlanimationModel').modal('toggle');
  $('#plannerURLInput').show();

  // Ground the domain and problem
  ground(domain, problem).then(function (result) {
    treeData = { "name": "root", "children": [], "state": result.state, "strState": result.strState, "precondition": null, "loadedChildren": false };
    stateCounter = 1;
    // launchViz and then initialise the planimation
    launchVizPlanimation().then(function () {
      initialisePlanimation(domain, problem, animation);

    })
  });

}


// initialise the planimation pixi library
function initialisePlanimation(domainPDDL, problemPDDL, animationPDDL) {
  require(["https://cdn.jsdelivr.net/gh/YIDING-CODER/VFG-Visualiser/plugin/planimationPixi.js"], function (Planimation) {
    planimation = new Planimation(domainPDDL, problemPDDL, animationPDDL, 250, 250);
    document.getElementById("planimation").appendChild(planimation.getView());
    document.getElementById("statespace").getElementsByTagName("svg")[0].style.height = "300px";
  });
}



function launchVizPlanimation() {
  window.new_tab('Statespace + Planimation', function (editor_name) {
    $('#' + editor_name).html('<div style = "margin:13px 26px;text-align:center"><h3>Heuristic Search Vizualization</h3>' +

      '<div class="row">' +
      '  <div class="col-md-9">' +
      '     <div id="statespace"></div>' +
      '     <div id="planimation"></div>' +
      '  </div>' +
      '  <div id="statepanel" class="col-md-3">' +
      '    <div id="statebuttons" style="padding:10px">' +
      '      <button onclick="show_hadd()" type="button" class="btn btn-info">hadd</button>' +
      '      <button onclick="compute_plan()" type="button" class="btn btn-success">Plan</button><br /><br />' +
      '      <button onclick="compute_all_heur()" type="button" class="btn btn-primary">Compute All Heuristics</button>' +
      '    </div>' +
      '    <div id="statename" style="clear:both">State</div>' +
      '    <div id="statedetails" style="padding:10px"></div>' +
      '  </div>' +
      '</div>' +

      '</div>' +
      '<node circle style ="fill:black;stroke:black;stroke-width:3px;></node circle>' +
      '<p id="hv-output"></p>');
  });


  return new Promise((resolve, reject) => {
    var res = makeTree();

    if (res)
      resolve('Lauch successfully');
    else {
      resolve('Lauch successfully');
      console.log("MakeTree return empty result")
    }
  });
}


// Single click on node: update the info shown for a node
function click(d) {
  nodeSelected(d);
  // plan is list of actions
  var plan = getNodeActions(d);
  // used to seperate root node and other node
  var nodeName = d.data.name;
  if (typeof planimation !== 'undefined') {
    planimation.updateWithPlan(plan, nodeName == "root");
  }
}

function getNodeActions(d) {

  if (d.data.name == "root") {
    return ""
  }
  return getNodeActions(d.parent) + "(" + d.data.precondition.replace(/[(),]/g, ' ').replace(/ +(?= )/g, '').trim() + ")"

}


function chooseVizPlanimationFiles(type) {

  console.log(type)
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
  $('#chooseFilesVizPlanimationModel').modal('toggle');
}

// wait until HeuristicViz is Loaded, then install HeuristicViz with Planimation
function checkHeuristicVizLoaded() {
  if (window.grounderLoaded) {

    define(function () {
      window.planimationSolverStyled = false;

      return {
        name: "Heuristic Viz with Planimation",
        author: "Cam Cunningham, Caitlin Aspinall, Ellie Sekine, Christian Muise, Nir Lipovetzky (plugin)",
        email: "16cea5@queensu.com",
        description: "Heuristic Vizualization with Planimation",
        initialize: function () {

          // Adds menu button that allows for choosing files
          window.remove_menu_button("heurVizMenuItem");
          window.add_menu_button('HvizPlanimation', 'vizPlanimationMenuItem', 'glyphicon-tower', "chooseVizPlanimationFiles('HvizPlanimation')");
          window.inject_styles('.viz_display {padding: 20px 0px 0px 40px;}')

          // Register this as a user of the file chooser interface
          window.register_file_chooser('HvizPlanimation',
            {
              showChoice: function () {
                // Button name, Description
                window.setup_file_chooser('Go', 'Display Visualization');
                $('#plannerURLInput').hide();

              },
              // Called when go is hit
              selectChoice: loadStatespacePlanimation
            });


          if (!(window.planimationSolverStyled)) {
            $('body').append(HVIZ_PLANIMATION_MODEL);
            window.planimationSolverStyled = true;
          }
        },

        disable: function () {
          // This is called whenever the plugin is disabled
          window.toastr.warning("Plug in disabled")
          window.remove_menu_button("vizPlanimationMenuItem");
        },

        save: function () {
          // Used to save the plugin settings for later
          window.toastr.warning("Plug in saved")
        },

        load: function (settings) {
          // Restore the plugin settings from a previous save call
          window.toastr.warning("Plug in loaded")
        }
      };

    });

  } else {
    window.setTimeout(checkHeuristicVizLoaded, 2000); /* this checks the flag every 100 milliseconds*/

  }
}

// If is loaded heuristic-viz then add heuristic-viz-planimation
if ("heuristic-viz" in window.plugins) {

  define(function () {
    window.planimationSolverStyled = false;

    return {
      name: "Heuristic Viz with Planimation",
      author: "Cam Cunningham, Caitlin Aspinall, Ellie Sekine, Christian Muise, Nir Lipovetzky (plugin)",
      email: "16cea5@queensu.com",
      description: "Heuristic Vizualization with Planimation",
      initialize: function () {

        // Adds menu button that allows for choosing files
        window.remove_menu_button("heurVizMenuItem");
        window.add_menu_button('HvizPlanimation', 'vizPlanimationMenuItem', 'glyphicon-tower', "chooseVizPlanimationFiles('HvizPlanimation')");
        window.inject_styles('.viz_display {padding: 20px 0px 0px 40px;}')

        // Register this as a user of the file chooser interface
        window.register_file_chooser('HvizPlanimation',
          {
            showChoice: function () {
              // Button name, Description
              window.setup_file_chooser('Go', 'Display Visualization');
              $('#plannerURLInput').hide();

            },
            // Called when go is hit
            selectChoice: loadStatespacePlanimation
          });


        if (!(window.planimationSolverStyled)) {
          $('body').append(HVIZ_PLANIMATION_MODEL);
          window.planimationSolverStyled = true;
        }
      },

      disable: function () {
        // This is called whenever the plugin is disabled
        window.toastr.warning("Plug in disabled")
        window.remove_menu_button("vizPlanimationMenuItem");
      },

      save: function () {
        // Used to save the plugin settings for later
        window.toastr.warning("Plug in saved")
      },

      load: function (settings) {
        // Restore the plugin settings from a previous save call
        window.toastr.warning("Plug in loaded")
      }
    };

  });
} else {
  add_featured_plugin('heuristic-viz');
  checkHeuristicVizLoaded();
}

