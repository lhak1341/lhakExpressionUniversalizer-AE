(function (thisObj) {
  /************************************************************
   * CONSTANTS AND CONFIGURATION
   ************************************************************/
  var CONFIG = {
    META: {
      SCRIPT_NAME: 'Universal Expression Converter',
      VERSION: 'v0.2.0',
      DESCRIPTION: 'Converts After Effects expressions to universal format for cross-language compatibility',
    },

    UI: {
      WINDOW: {
        WIDTH: 260,
        HEIGHT: 100,
        MARGINS: 12,
        SPACING: 6,
      },
      GROUP: {
        SPACING: 8,
      },
      DROPDOWN: {
        ITEMS: ['Selected Properties', 'Selected Layers', 'Active Comp', 'All Comps'],
        WIDTH: 150,
      },
      BUTTON: {
        UNIVERSALIZE: 'Universalize',
        DE_UNIVERSALIZE: 'De-Universalize',
        HEIGHT: 28,
        WIDTH_UNIVERSALIZE: 85,
        WIDTH_DE_UNIVERSALIZE: 100,
      },
      LABEL: {
        SCOPE: 'Scope:',
        STATUS: 'Ready to convert expressions',
        PROCESSING: 'Converting expressions...',
        COMPLETE: 'Conversion completed successfully',
      },
    },

    CONVERSION: {
      UNIVERSAL_SUFFIX: '[ue]',
      DEFAULT_LAYER_NAMES: [
        'Layer',
        'Solid',
        'Text',
        'Shape Layer',
        'Camera',
        'Light',
        'Null Object',
        'Adjustment Layer',
      ],
      DEFAULT_EFFECT_NAMES: {
        // Common English effect names that need universalization
        'Drop Shadow': true,
        'Gaussian Blur': true,
        'Color Correction': true,
        'Tint': true,
        'Hue/Saturation': true,
        'Levels': true,
        'Curves': true,
        'Fast Blur': true,
        'Glow': true,
        'Transform': true,
        'Motion Blur': true,
        'Radial Blur': true,
        'Directional Blur': true,
        'Channel Blur': true,
        'Brightness & Contrast': true,
        'Color Balance': true,
        'Auto Levels': true,
        'Auto Color': true,
        'Auto Contrast': true,
        'Shadow/Highlight': true,
        'Photo Filter': true,
        'Inner Shadow': true,
        'Outer Glow': true,
        'Inner Glow': true,
        'Bevel and Emboss': true,
        'Satin': true,
        'Color Overlay': true,
        'Gradient Overlay': true,
        'Pattern Overlay': true,
        'Stroke': true,
        'Fill': true,
        'CC Composite': true,
        'CC Light Rays': true,
        'CC Particle World': true,
        'CC Mr. Mercury': true,
        'Fractal Noise': true,
        'Turbulent Noise': true,
        'Cell Pattern': true,
        'Grid': true,
        'Lens Flare': true,
        'Lightning': true,
        'Ramp': true,
        'Solid Composite': true,
        'Wiggle': true,
        'Wave Warp': true,
        'Bulge': true,
        'Twirl': true,
        'Spherize': true,
        'Corner Pin': true,
        'Bezier Warp': true,
        'Mesh Warp': true,
        'Puppet': true,
        'Liquify': true,
        'Offset': true,
        'Numbers': true,
        'Timecode': true,
        'Audio Spectrum': true,
        'Audio Waveform': true,
        'Beam': true,
        'Slider Control': true,
        'Angle Control': true,
        'Point Control': true,
        'Checkbox Control': true,
        'Color Control': true,
        '3D Point Control': true,
      },
    },

    ALERT: {
      SUCCESS: 'Universal expression conversion completed successfully',
      ERROR_GENERIC: 'An error occurred: ',
      NO_PROJECT: 'Please open a project first',
      NO_COMPOSITION: 'No compositions found in project',
      NO_COMP_SELECTED: 'Please select a composition first',
      NO_LAYERS_SELECTED: 'Please select at least one layer',
      NO_PROPERTIES_SELECTED: 'Please select at least one property with expressions',
      CONVERSION_WARNING: 'This will modify expressions in your project. Make sure to save your work first.',
    },
  };

  /************************************************************
   * GLOBAL VARIABLES
   ************************************************************/
  var ui = null;
  var currentProject = null;
  var conversionStats = {
    expressionsConverted: 0,
    layersRenamed: 0,
    effectsRenamed: 0,
  };
  var renamedEffects = {}; // Track effects that have been renamed: {layerName: {oldEffectName: newEffectName}}
  var renamedLayers = {}; // Track layers that have been renamed: {oldLayerName: newLayerName}

  /************************************************************
   * INITIALIZATION
   ************************************************************/
  function init() {
    if (!validateProjectState()) {
      return;
    }

    ui = createUI(thisObj);
    buildUI();
    bindEvents();
    showUI();
  }

  /************************************************************
   * UI CREATION FUNCTIONS
   ************************************************************/

  /**
   * Creates the main UI window/panel
   * @param {Object} thisObj - ExtendScript 'this' object
   * @returns {Object} UI object with all control references
   */
  function createUI(thisObj) {
    var win;

    if (thisObj instanceof Panel) {
      win = thisObj;
    } else {
      win = new Window('palette', CONFIG.META.SCRIPT_NAME);
      win.orientation = 'column';
      win.alignChildren = ['fill', 'top'];
      win.spacing = CONFIG.UI.WINDOW.SPACING;
      win.margins = CONFIG.UI.WINDOW.MARGINS;
      win.preferredSize.width = CONFIG.UI.WINDOW.WIDTH;
      win.preferredSize.height = CONFIG.UI.WINDOW.HEIGHT;
    }

    return {
      window: win,
    };
  }

  /**
   * Builds the complete user interface
   */
  function buildUI() {
    ui.window.orientation = 'column';
    ui.window.alignChildren = ['fill', 'top'];
    ui.window.spacing = CONFIG.UI.WINDOW.SPACING;

    buildScopeRow();
    buildButtonRow();
    buildVersionLabel();

    ui.window.layout.layout(true);
  }

  /**
   * Builds the scope selection row
   */
  function buildScopeRow() {
    var scopeGroup = ui.window.add('group');
    scopeGroup.orientation = 'row';
    scopeGroup.alignChildren = ['left', 'center'];
    scopeGroup.spacing = CONFIG.UI.GROUP.SPACING;

    var scopeLabel = scopeGroup.add('statictext', undefined, CONFIG.UI.LABEL.SCOPE);

    ui.scopeDropdown = scopeGroup.add('dropdownlist', undefined, CONFIG.UI.DROPDOWN.ITEMS);
    ui.scopeDropdown.preferredSize.width = CONFIG.UI.DROPDOWN.WIDTH;
    ui.scopeDropdown.selection = 0; // Default to "Selected Properties"
  }

  /**
   * Builds the action buttons row
   */
  function buildButtonRow() {
    var buttonGroup = ui.window.add('group');
    buttonGroup.orientation = 'row';
    buttonGroup.alignChildren = ['center', 'center'];
    buttonGroup.spacing = CONFIG.UI.GROUP.SPACING;

    ui.universalizeBtn = buttonGroup.add('button', undefined, CONFIG.UI.BUTTON.UNIVERSALIZE);
    ui.universalizeBtn.preferredSize.width = CONFIG.UI.BUTTON.WIDTH_UNIVERSALIZE;
    ui.universalizeBtn.preferredSize.height = CONFIG.UI.BUTTON.HEIGHT;

    ui.deUniversalizeBtn = buttonGroup.add('button', undefined, CONFIG.UI.BUTTON.DE_UNIVERSALIZE);
    ui.deUniversalizeBtn.preferredSize.width = CONFIG.UI.BUTTON.WIDTH_DE_UNIVERSALIZE;
    ui.deUniversalizeBtn.preferredSize.height = CONFIG.UI.BUTTON.HEIGHT;
    ui.deUniversalizeBtn.enabled = true;
  }

  /**
   * Builds the version label
   */
  function buildVersionLabel() {
    ui.versionLabel = ui.window.add('statictext', undefined, CONFIG.META.VERSION);
    ui.versionLabel.alignment = ['center', 'top'];
    ui.versionLabel.graphics.font = ScriptUI.newFont('dialog', 'italic', 9);
  }

  /**
   * Shows the UI window
   */
  function showUI() {
    if (ui.window instanceof Window) {
      ui.window.center();
      ui.window.show();
    } else {
      ui.window.layout.layout(true);
    }
  }

  /************************************************************
   * EVENT HANDLER FUNCTIONS
   ************************************************************/

  /**
   * Binds all event handlers to UI elements
   */
  function bindEvents() {
    ui.universalizeBtn.onClick = function() {
      var scope = getScopeFromDropdown();
      handleConversion(scope);
    };

    ui.deUniversalizeBtn.onClick = function() {
      var scope = getScopeFromDropdown();
      handleDeUniversalize(scope);
    };
  }

  /**
   * Gets the conversion scope from the dropdown selection
   * @returns {string} Scope identifier
   */
  function getScopeFromDropdown() {
    var selectedIndex = ui.scopeDropdown.selection.index;
    var scopes = ['selectedProperties', 'selectedLayers', 'activeComposition', 'allCompositions'];
    return scopes[selectedIndex];
  }

  /**
   * Reverse conversion handler (de-universalize)
   * @param {string} scope - Conversion scope
   */
  function handleDeUniversalize(scope) {
    if (!confirm('Convert universal expressions back to property names?\n\nThis will convert property indices like (1)(3) back to transform.position.')) {
      return;
    }

    resetConversionStats();

    app.beginUndoGroup('De-Universalize Expressions - ' + scope);

    try {
      switch (scope) {
        case 'selectedProperties':
          deUniversalizeSelectedProperties();
          break;
        case 'selectedLayers':
          deUniversalizeSelectedLayers();
          break;
        case 'activeComposition':
          deUniversalizeActiveComposition();
          break;
        case 'allCompositions':
          deUniversalizeAllCompositions();
          break;
      }

      var message = 'De-universalization completed successfully!\n' +
        'Expressions converted: ' + conversionStats.expressionsConverted;
      
      alert(message);

    } catch (error) {
      alert('Error during de-universalization: ' + error.toString());
    } finally {
      app.endUndoGroup();
    }
  }

  /**
   * Main conversion handler
   * @param {string} scope - Conversion scope ('selectedProperties', 'selectedLayers', 'activeComposition', 'allCompositions')
   */
  function handleConversion(scope) {
    if (!confirm(CONFIG.ALERT.CONVERSION_WARNING)) {
      return;
    }

    resetConversionStats();

    app.beginUndoGroup('Convert to Universal Expressions - ' + scope);

    try {
      switch (scope) {
        case 'selectedProperties':
          convertSelectedProperties();
          break;
        case 'selectedLayers':
          convertSelectedLayers();
          break;
        case 'activeComposition':
          convertActiveComposition();
          break;
        case 'allCompositions':
          convertAllCompositions();
          break;
      }

      var message = CONFIG.ALERT.SUCCESS + '\n' +
        'Expressions converted: ' + conversionStats.expressionsConverted + '\n' +
        'Layers renamed: ' + conversionStats.layersRenamed + '\n' +
        'Effects renamed: ' + conversionStats.effectsRenamed;
      
      alert(message);

    } catch (error) {
      alert(CONFIG.ALERT.ERROR_GENERIC + error.toString());
    } finally {
      app.endUndoGroup();
    }
  }

  /************************************************************
   * CONVERSION FUNCTIONS - SCOPE HANDLERS
   ************************************************************/

  /**
   * Converts expressions in selected properties only using dependency-aware approach
   */
  function convertSelectedProperties() {
    var activeComp = app.project.activeItem;
    if (!(activeComp instanceof CompItem)) {
      throw new Error(CONFIG.ALERT.NO_COMP_SELECTED);
    }

    var selectedLayers = activeComp.selectedLayers;
    if (selectedLayers.length === 0) {
      throw new Error(CONFIG.ALERT.NO_LAYERS_SELECTED);
    }

    var foundSelectedProperties = false;

    // Check if any selected properties exist first
    for (var i = 0; i < selectedLayers.length; i++) {
      var layer = selectedLayers[i];
      if (convertSelectedPropertiesInLayer(layer)) {
        foundSelectedProperties = true;
      }
    }

    if (!foundSelectedProperties) {
      throw new Error(CONFIG.ALERT.NO_PROPERTIES_SELECTED);
    }

    // Dependency-aware conversion approach:
    // 1. Identify which layers/effects will be renamed based on selected scope
    var affectedLayers = getLayersWithSelectedProperties(selectedLayers);
    
    // 2. Also find layers referenced by expressions in the selected properties
    var referencedLayers = findReferencedLayersInSelectedProperties(selectedLayers);
    
    // 3. Merge affected layers and referenced layers
    var allAffectedLayers = mergeLayers(affectedLayers, referencedLayers);
    
    // 4. Rename identified layers and collect all effect references
    var globalEffectMapping = {};
    
    for (var i = 0; i < allAffectedLayers.length; i++) {
      var layer = allAffectedLayers[i];
      universalizeLayerNameWithTracking(layer);
      
      // Scan this layer for effect references (including cross-layer)
      var layerEffectMapping = findReferencedEffectsInLayer(layer, activeComp);
      
      // Merge into global mapping
      for (var layerName in layerEffectMapping) {
        if (layerEffectMapping.hasOwnProperty(layerName)) {
          if (!globalEffectMapping[layerName]) {
            globalEffectMapping[layerName] = [];
          }
          
          // Add effects that aren't already in the global list
          var effectNames = layerEffectMapping[layerName];
          for (var j = 0; j < effectNames.length; j++) {
            // Check if effect already exists (ExtendScript doesn't have indexOf)
            var effectExists = false;
            for (var k = 0; k < globalEffectMapping[layerName].length; k++) {
              if (globalEffectMapping[layerName][k] === effectNames[j]) {
                effectExists = true;
                break;
              }
            }
            if (!effectExists) {
              globalEffectMapping[layerName].push(effectNames[j]);
            }
          }
        }
      }
    }
    
    // Rename all referenced effects across all layers
    universalizeEffectsFromMapping(activeComp, globalEffectMapping);
    
    // 4.5. Update ALL expressions in the composition that reference renamed effects
    // For "Selected Properties" scope, only do name updates (no property indexing)
    updateAllExpressionsForRenamedEffects(activeComp, globalEffectMapping, false);
    
    // 5. Find all expressions in composition that reference renamed items
    var dependentProperties = findDependentExpressionsInComp(activeComp);
    
    // 6. Convert selected properties + any expressions that depend on renamed items
    for (var i = 0; i < selectedLayers.length; i++) {
      var layer = selectedLayers[i];
      convertSelectedPropertiesInItem(layer, 0);
    }
    
    // Convert dependent expressions outside the selected scope (effect names only, no property indexing)
    for (var i = 0; i < dependentProperties.length; i++) {
      var prop = dependentProperties[i];
      if (prop.expressionEnabled && prop.expression && prop.canSetExpression) {
        convertPropertyExpressionEffectNamesOnly(prop);
      }
    }
  }

  /**
   * Converts expressions in selected layers using dependency-aware approach
   */
  function convertSelectedLayers() {
    var activeComp = app.project.activeItem;
    if (!(activeComp instanceof CompItem)) {
      throw new Error(CONFIG.ALERT.NO_COMP_SELECTED);
    }

    var selectedLayers = activeComp.selectedLayers;
    if (selectedLayers.length === 0) {
      throw new Error(CONFIG.ALERT.NO_LAYERS_SELECTED);
    }

    // Dependency-aware conversion approach:
    // 1. For selected layers, we need to rename effects on ALL layers that have expressions
    //    in the selected layers, because those expressions might reference other layers' effects
    var referencedLayers = findAllReferencedLayers(selectedLayers);
    
    // 2. Rename layers and collect all effect references from selected layers AND any layers they reference
    var allAffectedLayers = mergeLayers(selectedLayers, referencedLayers);
    var globalEffectMapping = {};
    
    for (var i = 0; i < allAffectedLayers.length; i++) {
      var layer = allAffectedLayers[i];
      universalizeLayerNameWithTracking(layer);
      
      // Scan this layer for effect references (including cross-layer)
      var layerEffectMapping = findReferencedEffectsInLayer(layer, activeComp);
      
      // Merge into global mapping
      for (var layerName in layerEffectMapping) {
        if (layerEffectMapping.hasOwnProperty(layerName)) {
          if (!globalEffectMapping[layerName]) {
            globalEffectMapping[layerName] = [];
          }
          
          // Add effects that aren't already in the global list
          var effectNames = layerEffectMapping[layerName];
          for (var j = 0; j < effectNames.length; j++) {
            // Check if effect already exists (ExtendScript doesn't have indexOf)
            var effectExists = false;
            for (var k = 0; k < globalEffectMapping[layerName].length; k++) {
              if (globalEffectMapping[layerName][k] === effectNames[j]) {
                effectExists = true;
                break;
              }
            }
            if (!effectExists) {
              globalEffectMapping[layerName].push(effectNames[j]);
            }
          }
        }
      }
    }
    
    // Rename all referenced effects across all layers
    universalizeEffectsFromMapping(activeComp, globalEffectMapping);
    
    // 2.5. Update ALL expressions in the composition that reference renamed effects
    // For "Selected Layers" scope, only do name updates (no property indexing)  
    updateAllExpressionsForRenamedEffects(activeComp, globalEffectMapping, false);
    
    // 3. Find all expressions in composition that reference renamed items
    var dependentProperties = findDependentExpressionsInComp(activeComp);
    
    // 4. Convert selected layers + any expressions that depend on renamed items
    for (var i = 0; i < selectedLayers.length; i++) {
      var layer = selectedLayers[i];
      convertPropertiesInItem(layer);
    }
    
    // Convert dependent expressions outside the selected scope
    // But only do effect name updates, NOT property indexing (scope-strict approach)
    for (var i = 0; i < dependentProperties.length; i++) {
      var prop = dependentProperties[i];
      if (prop.expressionEnabled && prop.expression && prop.canSetExpression) {
        // Check if this property is within the selected scope
        var isInSelectedScope = isPropertyInSelectedLayers(prop, selectedLayers);
        
        if (isInSelectedScope) {
          // Full conversion for properties in selected scope
          convertPropertyExpression(prop);
        } else {
          // Only effect name conversion for properties outside selected scope
          convertPropertyExpressionEffectNamesOnly(prop);
        }
      }
    }
  }

  /**
   * Converts expressions in active composition
   */
  function convertActiveComposition() {
    var activeComp = app.project.activeItem;
    if (!(activeComp instanceof CompItem)) {
      throw new Error(CONFIG.ALERT.NO_COMP_SELECTED);
    }

    universalizeComposition(activeComp);
  }

  /**
   * Converts expressions in all compositions using project-wide two-phase approach
   */
  function convertAllCompositions() {
    var compositions = getProjectCompositions();
    if (compositions.length === 0) {
      throw new Error(CONFIG.ALERT.NO_COMPOSITION);
    }

    // Phase 1: Collect effect references from all compositions and rename effects
    for (var i = 0; i < compositions.length; i++) {
      var comp = compositions[i];
      var globalEffectMapping = {};
      
      for (var j = 1; j <= comp.numLayers; j++) {
        var layer = comp.layer(j);
        universalizeLayerName(layer);
        
        // Scan this layer for effect references (including cross-layer)
        var layerEffectMapping = findReferencedEffectsInLayer(layer, comp);
        
        // Merge into global mapping for this composition
        for (var layerName in layerEffectMapping) {
          if (layerEffectMapping.hasOwnProperty(layerName)) {
            if (!globalEffectMapping[layerName]) {
              globalEffectMapping[layerName] = [];
            }
            
            // Add effects that aren't already in the global list
            var effectNames = layerEffectMapping[layerName];
            for (var k = 0; k < effectNames.length; k++) {
              if (globalEffectMapping[layerName].indexOf(effectNames[k]) === -1) {
                globalEffectMapping[layerName].push(effectNames[k]);
              }
            }
          }
        }
      }
      
      // Rename all referenced effects in this composition
      universalizeEffectsFromMapping(comp, globalEffectMapping);
      
      // Update ALL expressions that reference renamed effects
      // For "All Comps" scope, do both name updates AND property indexing
      updateAllExpressionsForRenamedEffects(comp, globalEffectMapping, true);
    }
    
    // Phase 2: Convert all expressions after ALL renaming is complete
    for (var i = 0; i < compositions.length; i++) {
      var comp = compositions[i];
      for (var j = 1; j <= comp.numLayers; j++) {
        var layer = comp.layer(j);
        convertPropertiesInItem(layer);
      }
    }
  }

  /************************************************************
   * REVERSE CONVERSION FUNCTIONS (DE-UNIVERSALIZE)
   ************************************************************/

  /**
   * De-universalizes expressions in selected properties
   */
  function deUniversalizeSelectedProperties() {
    var activeComp = app.project.activeItem;
    if (!(activeComp instanceof CompItem)) {
      throw new Error(CONFIG.ALERT.NO_COMP_SELECTED);
    }

    var selectedLayers = activeComp.selectedLayers;
    if (selectedLayers.length === 0) {
      throw new Error(CONFIG.ALERT.NO_LAYERS_SELECTED);
    }

    var foundSelectedProperties = false;

    for (var i = 0; i < selectedLayers.length; i++) {
      var layer = selectedLayers[i];
      if (deUniversalizeSelectedPropertiesInLayer(layer)) {
        foundSelectedProperties = true;
      }
    }

    if (!foundSelectedProperties) {
      throw new Error(CONFIG.ALERT.NO_PROPERTIES_SELECTED);
    }
  }

  /**
   * De-universalizes expressions in selected layers
   */
  function deUniversalizeSelectedLayers() {
    var activeComp = app.project.activeItem;
    if (!(activeComp instanceof CompItem)) {
      throw new Error(CONFIG.ALERT.NO_COMP_SELECTED);
    }

    var selectedLayers = activeComp.selectedLayers;
    if (selectedLayers.length === 0) {
      throw new Error(CONFIG.ALERT.NO_LAYERS_SELECTED);
    }

    for (var i = 0; i < selectedLayers.length; i++) {
      var layer = selectedLayers[i];
      deUniversalizePropertiesInItem(layer);
    }
  }

  /**
   * De-universalizes expressions in active composition
   */
  function deUniversalizeActiveComposition() {
    var activeComp = app.project.activeItem;
    if (!(activeComp instanceof CompItem)) {
      throw new Error(CONFIG.ALERT.NO_COMP_SELECTED);
    }

    for (var i = 1; i <= activeComp.numLayers; i++) {
      var layer = activeComp.layer(i);
      deUniversalizePropertiesInItem(layer);
    }
  }

  /**
   * De-universalizes expressions in all compositions
   */
  function deUniversalizeAllCompositions() {
    var compositions = getProjectCompositions();
    if (compositions.length === 0) {
      throw new Error(CONFIG.ALERT.NO_COMPOSITION);
    }

    for (var i = 0; i < compositions.length; i++) {
      var comp = compositions[i];
      for (var j = 1; j <= comp.numLayers; j++) {
        var layer = comp.layer(j);
        deUniversalizePropertiesInItem(layer);
      }
    }
  }

  /**
   * De-universalizes properties in selected properties of a layer
   * @param {Layer} layer - Layer to check
   * @returns {boolean} True if any selected properties were found
   */
  function deUniversalizeSelectedPropertiesInLayer(layer) {
    return deUniversalizeSelectedPropertiesInItem(layer, 0);
  }

  /**
   * De-universalizes only selected properties with expressions in an item
   * @param {PropertyGroup|Layer} item - Item to process
   * @param {number} nestingLevel - Current nesting depth
   * @returns {boolean} True if any selected properties were found
   */
  function deUniversalizeSelectedPropertiesInItem(item, nestingLevel) {
    if (!item || !item.numProperties) return false;

    var foundSelected = false;

    for (var i = 1; i <= item.numProperties; i++) {
      try {
        var prop = item.property(i);
        if (!prop) continue;

        if (prop.propertyType === PropertyType.PROPERTY && prop.selected) {
          foundSelected = true;
          // De-universalize expression if it exists
          if (prop.expressionEnabled && prop.expression && prop.canSetExpression) {
            deUniversalizePropertyExpression(prop);
          }
        }

        if (prop.propertyType === PropertyType.INDEXED_GROUP || 
            prop.propertyType === PropertyType.NAMED_GROUP) {
          // Recursively process property groups
          if (deUniversalizeSelectedPropertiesInItem(prop, nestingLevel + 1)) {
            foundSelected = true;
          }
        }
      } catch (err) {
        // Skip inaccessible properties
      }
    }

    return foundSelected;
  }

  /**
   * De-universalizes all properties with expressions in an item
   * @param {PropertyGroup|Layer} item - Item to process
   */
  function deUniversalizePropertiesInItem(item) {
    if (!item || !item.numProperties) return;

    for (var i = 1; i <= item.numProperties; i++) {
      try {
        var prop = item.property(i);
        if (!prop) continue;

        if (prop.propertyType === PropertyType.PROPERTY) {
          // De-universalize expression if it exists
          if (prop.expressionEnabled && prop.expression && prop.canSetExpression) {
            deUniversalizePropertyExpression(prop);
          }
        } else if (prop.propertyType === PropertyType.INDEXED_GROUP || 
                   prop.propertyType === PropertyType.NAMED_GROUP) {
          // Recursively process property groups
          deUniversalizePropertiesInItem(prop);
        }
      } catch (err) {
        // Skip inaccessible properties
      }
    }
  }

  /**
   * De-universalizes a single property expression
   * @param {Property} prop - Property to de-universalize
   */
  function deUniversalizePropertyExpression(prop) {
    try {
      var originalExpression = prop.expression;
      var normalExpression = convertUniversalToNormal(originalExpression, prop);
      
      if (normalExpression !== originalExpression) {
        prop.expression = normalExpression;
        conversionStats.expressionsConverted++;
      }
    } catch (err) {
      // Log error but continue processing other properties
    }
  }

  /**
   * Converts universal expression format back to normal property names
   * @param {string} expression - Universal expression
   * @param {Property} contextProp - Property containing this expression
   * @returns {string} Normal expression with property names
   */
  function convertUniversalToNormal(expression, contextProp) {
    var converted = expression;
    
    try {
      // Get the layer containing this property for context
      var contextLayer = getPropertyLayer(contextProp);
      
      // Split expression into code and comment parts to avoid converting comments
      var parts = separateCodeFromComments(expression);
      
      // Only convert the non-commented parts
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        
        if (!part.isComment) {
          // Convert property index chains back to property names
          part.content = convertIndexChainToPropertyNames(part.content, contextLayer);
          // Convert effect property indices back to property names
          part.content = convertEffectIndicesToNames(part.content, contextLayer);
        }
      }

      // Reconstruct the expression
      converted = reconstructExpressionFromParts(parts);

    } catch (err) {
      // If conversion fails, return original expression
    }

    return converted;
  }

  /**
   * Converts property index chains like (1)(3) back to property names like transform.position
   * @param {string} expression - Expression to convert
   * @param {Layer} contextLayer - Layer containing the expression
   * @returns {string} Converted expression
   */
  function convertIndexChainToPropertyNames(expression, contextLayer) {
    if (!contextLayer) return expression;

    var converted = expression;

    try {
      // Build reverse mappings from indices to property names
      var reverseMappings = getReversePropertyMappings(contextLayer);
      
      // Convert index chains to property names with proper dot notation
      for (var indexChain in reverseMappings) {
        if (reverseMappings.hasOwnProperty(indexChain)) {
          var propertyName = reverseMappings[indexChain];
          
          // Create pattern to match layer/comp references followed by index chain
          // Matches: layer("name")(1)(3) or comp("name")(1)(3) or )(1)(3) 
          var pattern = '(\\)|layer\\s*\\([^)]+\\)|comp\\s*\\([^)]+\\))' + escapeRegExp(indexChain);
          var regex = new RegExp(pattern, 'g');
          
          converted = converted.replace(regex, function(match, prefix) {
            return prefix + '.' + propertyName;
          });
        }
      }
    } catch (err) {
      // If we can't get mappings, return original expression
    }

    return converted;
  }

  /**
   * Converts effect property indices back to property names
   * @param {string} expression - Expression to convert
   * @param {Layer} contextLayer - Layer containing the expression
   * @returns {string} Converted expression
   */
  function convertEffectIndicesToNames(expression, contextLayer) {
    if (!contextLayer) return expression;

    var converted = expression;

    try {
      // Find all effect references with property indices
      // Pattern: effect("Effect Name")(1) or effect("Effect Name [ue]")(2)
      var effectPattern = /effect\s*\(\s*["']([^"']+)["']\s*\)\s*\((\d+)\)/g;
      var match;
      
      while ((match = effectPattern.exec(expression)) !== null) {
        var fullMatch = match[0];
        var effectName = match[1];
        var propertyIndex = parseInt(match[2]);
        
        // Find the property name for this index
        var propertyName = getEffectPropertyName(contextLayer, effectName, propertyIndex);
        if (propertyName) {
          var replacement = 'effect("' + effectName + '")("' + propertyName + '")';
          converted = converted.replace(fullMatch, replacement);
        }
      }
      
      // Handle cross-layer effect references
      // Pattern: thisComp.layer("name").effect("Effect Name")(1)
      var crossLayerPattern = /(thisComp\.layer\s*\(\s*["']([^"']+)["']\s*\)\.effect\s*\(\s*["']([^"']+)["']\s*\)\s*\((\d+)\))/g;
      
      while ((match = crossLayerPattern.exec(expression)) !== null) {
        var fullMatch = match[0];
        var layerName = match[2];
        var effectName = match[3];
        var propertyIndex = parseInt(match[4]);
        
        // Find the target layer
        var targetLayer = findLayerByName(contextLayer.containingComp, layerName);
        if (targetLayer) {
          var propertyName = getEffectPropertyName(targetLayer, effectName, propertyIndex);
          if (propertyName) {
            var replacement = 'thisComp.layer("' + layerName + '").effect("' + effectName + '")("' + propertyName + '")';
            converted = converted.replace(fullMatch, replacement);
          }
        }
      }
    } catch (err) {
      // If conversion fails, return original expression
    }

    return converted;
  }

  /**
   * Gets the property name for a specific effect property index
   * @param {Layer} layer - Layer containing the effect
   * @param {string} effectName - Name of the effect
   * @param {number} propertyIndex - Property index to look up
   * @returns {string|null} Property name or null if not found
   */
  function getEffectPropertyName(layer, effectName, propertyIndex) {
    try {
      // Remove [ue] suffix if present
      var cleanEffectName = effectName.replace(/\s*\[ue\]$/, '');
      
      // Find the effect on the layer
      var effectsGroup = layer.property('ADBE Effect Parade');
      if (!effectsGroup) return null;
      
      var effect = null;
      for (var i = 1; i <= effectsGroup.numProperties; i++) {
        var currentEffect = effectsGroup.property(i);
        if (currentEffect && currentEffect.name) {
          var currentName = currentEffect.name.replace(/\s*\[ue\]$/, '');
          if (currentName === cleanEffectName) {
            effect = currentEffect;
            break;
          }
        }
      }
      
      if (!effect) return null;
      
      // Get the property at the specified index
      if (propertyIndex >= 1 && propertyIndex <= effect.numProperties) {
        var property = effect.property(propertyIndex);
        if (property && property.name) {
          return property.name;
        }
      }
      
      return null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Gets reverse mappings from property index chains to property names
   * @param {Layer} layer - Layer to analyze
   * @returns {Object} Reverse mapping object
   */
  function getReversePropertyMappings(layer) {
    var reverseMappings = {};
    
    try {
      // Get transform properties
      if (layer.property('ADBE Transform Group')) {
        var transform = layer.property('ADBE Transform Group');
        var commonProps = [
          { name: 'anchorPoint', matchName: 'ADBE Anchor Point' },
          { name: 'position', matchName: 'ADBE Position' },
          { name: 'scale', matchName: 'ADBE Scale' },
          { name: 'rotation', matchName: 'ADBE Rotate Z' },
          { name: 'opacity', matchName: 'ADBE Opacity' }
        ];
        
        for (var i = 0; i < commonProps.length; i++) {
          var propInfo = commonProps[i];
          var prop = transform.property(propInfo.matchName);
          if (prop) {
            var indexChain = getPropertyIndexChain(prop);
            if (indexChain) {
              reverseMappings[indexChain] = 'transform.' + propInfo.name;
            }
          }
        }
      }
      
      // Add fallback mappings for common cases
      if (!reverseMappings['(1)(2)']) reverseMappings['(1)(2)'] = 'transform.anchorPoint';
      if (!reverseMappings['(1)(3)']) reverseMappings['(1)(3)'] = 'transform.position';
      if (!reverseMappings['(1)(4)']) reverseMappings['(1)(4)'] = 'transform.scale';
      if (!reverseMappings['(1)(5)']) reverseMappings['(1)(5)'] = 'transform.rotation';
      if (!reverseMappings['(1)(6)']) reverseMappings['(1)(6)'] = 'transform.opacity';
      
    } catch (err) {
      // Use fallback mappings if we can't get actual mappings
      reverseMappings = {
        '(1)(2)': 'transform.anchorPoint',
        '(1)(3)': 'transform.position',
        '(1)(4)': 'transform.scale',
        '(1)(5)': 'transform.rotation',
        '(1)(6)': 'transform.opacity'
      };
    }
    
    return reverseMappings;
  }

  /************************************************************
   * CORE CONVERSION FUNCTIONS
   ************************************************************/

  /**
   * Universalizes a single composition using two-phase approach
   * @param {CompItem} comp - Composition to convert
   */
  function universalizeComposition(comp) {
    // Phase 1: Collect all effect references from all layers first
    var globalEffectMapping = {};
    
    for (var i = 1; i <= comp.numLayers; i++) {
      var layer = comp.layer(i);
      universalizeLayerName(layer);
      
      // Scan this layer for effect references (including cross-layer)
      var layerEffectMapping = findReferencedEffectsInLayer(layer, comp);
      
      // Merge into global mapping
      for (var layerName in layerEffectMapping) {
        if (layerEffectMapping.hasOwnProperty(layerName)) {
          if (!globalEffectMapping[layerName]) {
            globalEffectMapping[layerName] = [];
          }
          
          // Add effects that aren't already in the global list
          var effectNames = layerEffectMapping[layerName];
          for (var j = 0; j < effectNames.length; j++) {
            // Check if effect already exists (ExtendScript doesn't have indexOf)
            var effectExists = false;
            for (var k = 0; k < globalEffectMapping[layerName].length; k++) {
              if (globalEffectMapping[layerName][k] === effectNames[j]) {
                effectExists = true;
                break;
              }
            }
            if (!effectExists) {
              globalEffectMapping[layerName].push(effectNames[j]);
            }
          }
        }
      }
    }
    
    // Rename all referenced effects across all layers
    universalizeEffectsFromMapping(comp, globalEffectMapping);
    
    // Phase 1.5: Update ALL expressions that reference renamed effects
    // For "Active Comp" scope, do both name updates AND property indexing
    updateAllExpressionsForRenamedEffects(comp, globalEffectMapping, true);
    
    // Phase 2: Convert all expressions after all renaming is complete
    for (var i = 1; i <= comp.numLayers; i++) {
      var layer = comp.layer(i);
      convertPropertiesInItem(layer);
    }
  }

  /**
   * Universalizes a single layer
   * @param {Layer} layer - Layer to convert
   */
  function universalizeLayer(layer) {
    // First, universalize the layer name if needed
    universalizeLayerName(layer);

    // Second, scan expressions to find which effects are actually referenced (including cross-layer)
    var referencedEffectsMapping = findReferencedEffectsInLayer(layer, layer.containingComp);
    
    // Only rename effects that are actually referenced in expressions (across all layers)
    universalizeEffectsFromMapping(layer.containingComp, referencedEffectsMapping);

    // Then convert all properties with expressions
    convertPropertiesInItem(layer);
  }

  /**
   * Finds all effects referenced in expressions within a layer (including cross-layer references)
   * @param {Layer} layer - Layer to scan
   * @param {CompItem} comp - Composition containing the layer
   * @returns {Object} Object with layerName -> [effectNames] mapping
   */
  function findReferencedEffectsInLayer(layer, comp) {
    var referencedEffects = {};
    
    
    function scanPropertyForEffectReferences(item) {
      if (!item || !item.numProperties) return;
      
      for (var i = 1; i <= item.numProperties; i++) {
        try {
          var prop = item.property(i);
          if (!prop) continue;
          
          if (prop.propertyType === PropertyType.PROPERTY && prop.expression) {
            // Look for effect references in the expression
            var expression = prop.expression;
            
            // Look for cross-layer effect references first: thisComp.layer("LayerName").effect("EffectName")
            var crossLayerMatches = expression.match(/thisComp\.layer\s*\(\s*["']([^"']+)["']\s*\)\.effect\s*\(\s*["']([^"']+)["']\s*\)/g);
            if (crossLayerMatches) {
              for (var j = 0; j < crossLayerMatches.length; j++) {
                var fullMatch = crossLayerMatches[j];
                var match = fullMatch.match(/thisComp\.layer\s*\(\s*["']([^"']+)["']\s*\)\.effect\s*\(\s*["']([^"']+)["']\s*\)/);
                if (match) {
                  var targetLayerName = match[1];
                  var effectName = match[2];
                  
                  // Remove [ue] suffix if already present
                  targetLayerName = targetLayerName.replace(/\s*\[ue\]$/, '');
                  effectName = effectName.replace(/\s*\[ue\]$/, '');
                  
                  try {
                    if (!referencedEffects[targetLayerName]) {
                      referencedEffects[targetLayerName] = [];
                      }
                    
                    
                    // Check if effect already exists (ExtendScript doesn't have indexOf)
                    var effectExists = false;
                    for (var k = 0; k < referencedEffects[targetLayerName].length; k++) {
                      if (referencedEffects[targetLayerName][k] === effectName) {
                        effectExists = true;
                        break;
                      }
                    }
                    
                    if (!effectExists) {
                      referencedEffects[targetLayerName].push(effectName);
                    } else {
                      //$.writeln('DEBUG: Effect "' + effectName + '" already exists in layer "' + targetLayerName + '" array');
                    }
                    //$.writeln('DEBUG: Added cross-layer effect reference: "' + effectName + '" on layer "' + targetLayerName + '"');
                  } catch (err) {
                    //$.writeln('DEBUG: Error in array operations: ' + err.toString());
                  }
                } else {
                  //$.writeln('DEBUG: Failed to parse cross-layer match: ' + fullMatch);
                }
              }
            }
            
            // Look for local effect references: effect("Name") but exclude ones that are part of cross-layer references
            var allEffectMatches = expression.match(/\beffect\s*\(\s*["']([^"']+)["']\s*\)/g);
            //$.writeln('DEBUG: Local effect matches found: ' + (allEffectMatches ? allEffectMatches.length : 0));
            if (allEffectMatches) {
              for (var j = 0; j < allEffectMatches.length; j++) {
                var fullMatch = allEffectMatches[j];
                var match = fullMatch.match(/effect\s*\(\s*["']([^"']+)["']\s*\)/);
                if (match) {
                  // Check if this effect call is part of a cross-layer reference
                  var effectName = match[1];
                  var isPartOfCrossLayer = false;
                  
                  if (crossLayerMatches) {
                    for (var k = 0; k < crossLayerMatches.length; k++) {
                      if (crossLayerMatches[k].indexOf(fullMatch) !== -1) {
                        isPartOfCrossLayer = true;
                        break;
                      }
                    }
                  }
                  
                  if (!isPartOfCrossLayer) {
                    // This is a local effect reference
                    effectName = effectName.replace(/\s*\[ue\]$/, '');
                    
                    if (!referencedEffects[layer.name]) {
                      referencedEffects[layer.name] = [];
                    }
                    
                    // Check if effect already exists (ExtendScript doesn't have indexOf)
                    var effectExists = false;
                    for (var m = 0; m < referencedEffects[layer.name].length; m++) {
                      if (referencedEffects[layer.name][m] === effectName) {
                        effectExists = true;
                        break;
                      }
                    }
                    
                    if (!effectExists) {
                      referencedEffects[layer.name].push(effectName);
                    }
                    //$.writeln('DEBUG: Found local effect reference: "' + effectName + '" on layer "' + layer.name + '"');
                  }
                }
              }
            }
          }
          
          // Recursively scan property groups
          if (prop.propertyType === PropertyType.INDEXED_GROUP || 
              prop.propertyType === PropertyType.NAMED_GROUP) {
            scanPropertyForEffectReferences(prop);
          }
        } catch (err) {
          // Skip inaccessible properties
        }
      }
    }
    
    scanPropertyForEffectReferences(layer);
    
    // DEBUG: Log results
    var totalEffects = 0;
    for (var layerName in referencedEffects) {
      totalEffects += referencedEffects[layerName].length;
    }
    //$.writeln('DEBUG: Found ' + totalEffects + ' referenced effects across layers');
    
    return referencedEffects;
  }

  /**
   * Universalizes effects based on a cross-layer mapping
   * @param {CompItem} comp - Composition containing the layers
   * @param {Object} effectMapping - Object with layerName -> [effectNames] mapping
   */
  function universalizeEffectsFromMapping(comp, effectMapping) {
    if (!comp || !effectMapping) return;
    
    for (var layerName in effectMapping) {
      if (effectMapping.hasOwnProperty(layerName)) {
        var effectNames = effectMapping[layerName];
        
        if (!effectNames || effectNames.length === 0) {
          //$.writeln('DEBUG: No effects to rename for layer "' + layerName + '"');
          continue;
        }
        
        //$.writeln('DEBUG: About to rename ' + effectNames.length + ' effects on layer "' + layerName + '": ' + effectNames.join(', '));
        
        // Find the layer in the composition
        var targetLayer = findLayerByName(comp, layerName);
        if (!targetLayer) {
          //$.writeln('DEBUG: Could not find layer "' + layerName + '" in composition');
          continue;
        }
        
        try {
          var effectsGroup = targetLayer.property('ADBE Effect Parade');
          if (!effectsGroup) continue;
          
          for (var i = 1; i <= effectsGroup.numProperties; i++) {
            try {
              var effect = effectsGroup.property(i);
              if (!effect || !effect.name) continue;
              
              var currentName = effect.name;
              
              // Skip if already has universal suffix
              if (currentName.indexOf(CONFIG.CONVERSION.UNIVERSAL_SUFFIX) !== -1) {
                continue;
              }
              
              // Only rename if this effect is in the referenced list
              // Check if effect is in the list (ExtendScript doesn't have indexOf)
              var effectInList = false;
              for (var idx = 0; idx < effectNames.length; idx++) {
                if (effectNames[idx] === currentName) {
                  effectInList = true;
                  break;
                }
              }
              if (effectInList) {
                //$.writeln('DEBUG: Renaming effect "' + currentName + '" to "' + currentName + ' ' + CONFIG.CONVERSION.UNIVERSAL_SUFFIX + '"');
                effect.name = currentName + ' ' + CONFIG.CONVERSION.UNIVERSAL_SUFFIX;
                conversionStats.effectsRenamed++;
              } else {
                //$.writeln('DEBUG: Skipping effect "' + currentName + '" - not in referenced list');
              }
            } catch (err) {
              // Skip inaccessible effects
            }
          }
        } catch (err) {
          // Effects group not accessible or doesn't exist
        }
      }
    }
  }

  /**
   * Updates all expressions in a composition that reference renamed effects
   * @param {CompItem} comp - Composition to update
   * @param {Object} renamedEffectsMapping - Object with layerName -> [effectNames] mapping of renamed effects
   * @param {boolean} includePropertyIndexing - Whether to also convert property indexing
   */
  function updateAllExpressionsForRenamedEffects(comp, renamedEffectsMapping, includePropertyIndexing) {
    if (!comp || !renamedEffectsMapping) return;
    
    // Scan all layers in the composition
    for (var i = 1; i <= comp.numLayers; i++) {
      var layer = comp.layer(i);
      updateExpressionsInLayer(layer, renamedEffectsMapping, includePropertyIndexing);
    }
  }

  /**
   * Updates expressions in a single layer that reference renamed effects
   * @param {Layer} layer - Layer to update
   * @param {Object} renamedEffectsMapping - Object with layerName -> [effectNames] mapping of renamed effects
   * @param {boolean} includePropertyIndexing - Whether to also convert property indexing
   */
  function updateExpressionsInLayer(layer, renamedEffectsMapping, includePropertyIndexing) {
    if (!layer) return;
    
    function updatePropertyExpressions(item) {
      if (!item || !item.numProperties) return;
      
      for (var i = 1; i <= item.numProperties; i++) {
        try {
          var prop = item.property(i);
          if (!prop) continue;
          
          if (prop.propertyType === PropertyType.PROPERTY && prop.expression) {
            var originalExpression = prop.expression;
            var updatedExpression = updateExpressionForRenamedEffects(originalExpression, renamedEffectsMapping, layer, includePropertyIndexing);
            
            if (updatedExpression !== originalExpression) {
              prop.expression = updatedExpression;
            }
          }
          
          // Recursively process property groups
          if (prop.propertyType === PropertyType.INDEXED_GROUP || 
              prop.propertyType === PropertyType.NAMED_GROUP) {
            updatePropertyExpressions(prop);
          }
        } catch (err) {
          // Skip inaccessible properties
        }
      }
    }
    
    updatePropertyExpressions(layer);
  }

  /**
   * Updates an expression to use renamed effect names
   * @param {string} expression - Original expression
   * @param {Object} renamedEffectsMapping - Object with layerName -> [effectNames] mapping of renamed effects
   * @param {Layer} contextLayer - Layer containing this expression
   * @param {boolean} includePropertyIndexing - Whether to also convert property indexing
   * @returns {string} Updated expression
   */
  function updateExpressionForRenamedEffects(expression, renamedEffectsMapping, contextLayer, includePropertyIndexing) {
    var updated = expression;
    
    try {
      // Update cross-layer effect references: thisComp.layer("LayerName").effect("EffectName")
      for (var layerName in renamedEffectsMapping) {
        if (renamedEffectsMapping.hasOwnProperty(layerName)) {
          var effectNames = renamedEffectsMapping[layerName];
          
          for (var i = 0; i < effectNames.length; i++) {
            var effectName = effectNames[i];
            var originalName = effectName;
            var universalName = effectName + ' ' + CONFIG.CONVERSION.UNIVERSAL_SUFFIX;
            
            // Update cross-layer references
            var crossLayerPattern = new RegExp('thisComp\\.layer\\s*\\(\\s*["\']' + layerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']\\s*\\)\\.effect\\s*\\(\\s*["\']' + originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']\\s*\\)', 'g');
            updated = updated.replace(crossLayerPattern, 'thisComp.layer("' + layerName + '").effect("' + universalName + '")');
            
            // Update local references (only if we're on the same layer)
            if (layerName === contextLayer.name) {
              var localPattern = new RegExp('\\beffect\\s*\\(\\s*["\']' + originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']\\s*\\)', 'g');
              updated = updated.replace(localPattern, 'effect("' + universalName + '")');
            }
          }
        }
      }
      
      // Conditionally do property indexing based on scope
      if (includePropertyIndexing) {
        // For "Active Comp" scope - convert property indexing as well
        updated = convertEffectPropertyIndexing(updated, contextLayer);
      }
      // For "Selected Properties/Layers" scope - only fix names, no property indexing
      
    } catch (err) {
      // If update fails, return original expression
    }
    
    return updated;
  }

  /**
   * Converts effect property indexing for expressions that already have universal effect names
   * @param {string} expression - Expression to convert
   * @param {Layer} contextLayer - Layer containing the expression
   * @returns {string} Expression with property indexing converted
   */
  function convertEffectPropertyIndexing(expression, contextLayer) {
    var converted = expression;
    
    try {
      // Handle property indexing for effect("name")("property") patterns
      var effectPropRegex = /effect\s*\(\s*["']([^"']+)["']\s*\)\s*\(\s*["']([^"']+)["']\s*\)/g;
      var matches = [];
      var match;

      // Collect all matches first from the ORIGINAL expression (not modified version)
      while ((match = effectPropRegex.exec(expression)) !== null) {
        matches.push({
          fullMatch: match[0],
          effectName: match[1],
          propertyName: match[2],
          matchIndex: match.index
        });
      }

      // Sort matches by index in reverse order to avoid position shifting during replacement
      matches.sort(function(a, b) { return b.matchIndex - a.matchIndex; });

      // Process each match for property indexing (from end to beginning)
      for (var i = 0; i < matches.length; i++) {
        var matchData = matches[i];
        var effectName = matchData.effectName;
        var propertyName = matchData.propertyName;

        // Remove [ue] suffix for property index lookup
        var cleanEffectName = effectName.replace(' ' + CONFIG.CONVERSION.UNIVERSAL_SUFFIX, '');
        
        // Get property index for this effect property
        var targetLayer = findLayerWithEffect(contextLayer, cleanEffectName, expression, matchData.fullMatch);
        var propertyIndex = getEffectPropertyIndex(targetLayer, cleanEffectName, propertyName);
        
        if (propertyIndex > 0) {
          // Replace effect("name")("property") with effect("name")(index) using string position
          var replacement = 'effect("' + effectName + '")(' + propertyIndex + ')';
          
          // Use substring replacement to avoid regex state issues
          var beforeMatch = converted.substring(0, matchData.matchIndex);
          var afterMatch = converted.substring(matchData.matchIndex + matchData.fullMatch.length);
          converted = beforeMatch + replacement + afterMatch;
        }
      }
      
    } catch (err) {
      // If property indexing fails, return expression as-is
    }
    
    return converted;
  }

  /**
   * Universalizes only the specified effect names (legacy function for backward compatibility)
   * @param {Layer} layer - Layer containing effects
   * @param {Array} effectNames - Array of effect names to universalize
   */
  function universalizeReferencedEffectNames(layer, effectNames) {
    if (!layer || !effectNames || effectNames.length === 0) {
      //$.writeln('DEBUG: No effects to rename for layer "' + layer.name + '"');
      return;
    }
    
    var mapping = {};
    mapping[layer.name] = effectNames;
    universalizeEffectsFromMapping(layer.containingComp, mapping);
  }

  /**
   * Converts selected properties only within a layer
   * @param {Layer} layer - Layer containing selected properties
   * @returns {boolean} True if any selected properties were found
   */
  function convertSelectedPropertiesInLayer(layer) {
    var foundSelected = false;

    // Check if this layer has selected properties
    if (hasSelectedProperties(layer)) {
      foundSelected = true;
    }

    return foundSelected;
  }

  /**
   * Checks if a property group has any selected properties
   * @param {PropertyGroup|Layer} item - Item to check
   * @returns {boolean} True if has selected properties
   */
  function hasSelectedProperties(item) {
    if (!item || !item.numProperties) return false;

    for (var i = 1; i <= item.numProperties; i++) {
      try {
        var prop = item.property(i);
        if (!prop) continue;

        if (prop.propertyType === PropertyType.PROPERTY && prop.selected) {
          return true;
        }

        if ((prop.propertyType === PropertyType.INDEXED_GROUP || 
             prop.propertyType === PropertyType.NAMED_GROUP) && 
            hasSelectedProperties(prop)) {
          return true;
        }
      } catch (err) {
        // Skip inaccessible properties
      }
    }

    return false;
  }

  /************************************************************
   * PROPERTY CONVERSION FUNCTIONS
   ************************************************************/

  /**
   * Converts all properties with expressions in an item
   * @param {PropertyGroup|Layer} item - Item to process
   */
  function convertPropertiesInItem(item) {
    if (!item || !item.numProperties) return;

    for (var i = 1; i <= item.numProperties; i++) {
      try {
        var prop = item.property(i);
        if (!prop) continue;

        if (prop.propertyType === PropertyType.PROPERTY) {
          // Convert expression if it exists
          if (prop.expressionEnabled && prop.expression && prop.canSetExpression) {
            convertPropertyExpression(prop);
          }
        } else if (prop.propertyType === PropertyType.INDEXED_GROUP || 
                   prop.propertyType === PropertyType.NAMED_GROUP) {
          // Handle effect groups specially
          if (prop.matchName && prop.matchName.indexOf('ADBE Effect Parade') !== -1) {
            // Skip effect group processing - effects should already be renamed selectively
            // in the earlier phase if they were referenced in expressions
          }
          
          // Recursively process property groups
          convertPropertiesInItem(prop);
        }
      } catch (err) {
        // Skip inaccessible properties
      }
    }
  }

  /**
   * Converts only selected properties with expressions in an item
   * @param {PropertyGroup|Layer} item - Item to process
   * @param {number} nestingLevel - Current nesting depth
   */
  function convertSelectedPropertiesInItem(item, nestingLevel) {
    if (!item || !item.numProperties) return;

    for (var i = 1; i <= item.numProperties; i++) {
      try {
        var prop = item.property(i);
        if (!prop) continue;

        if (prop.propertyType === PropertyType.PROPERTY && prop.selected) {
          // Convert expression if it exists
          if (prop.expressionEnabled && prop.expression && prop.canSetExpression) {
            convertPropertyExpression(prop);
          }
        }

        if (prop.propertyType === PropertyType.INDEXED_GROUP || 
            prop.propertyType === PropertyType.NAMED_GROUP) {
          // Handle effect groups specially
          if (prop.matchName && prop.matchName.indexOf('ADBE Effect Parade') !== -1) {
            // Skip effect group processing - effects should already be renamed selectively
            // in the earlier phase if they were referenced in expressions
          }
          
          // Recursively process property groups
          convertSelectedPropertiesInItem(prop, nestingLevel + 1);
        }
      } catch (err) {
        // Skip inaccessible properties
      }
    }
  }

  /**
   * Converts a single property's expression to universal format
   * @param {Property} prop - Property with expression to convert
   */
  function convertPropertyExpression(prop) {
    try {
      var originalExpression = prop.expression;
      var universalExpression = convertExpressionToUniversal(originalExpression, prop);
      
      if (universalExpression !== originalExpression) {
        prop.expression = universalExpression;
        conversionStats.expressionsConverted++;
      }
    } catch (err) {
      // Log error but continue processing other properties
    }
  }

  /**
   * Converts only effect names in an expression (no property indexing)
   * @param {Property} prop - Property with expression to convert
   */
  function convertPropertyExpressionEffectNamesOnly(prop) {
    try {
      var originalExpression = prop.expression;
      var partialExpression = convertExpressionEffectNamesOnly(originalExpression, prop);
      
      if (partialExpression !== originalExpression) {
        prop.expression = partialExpression;
        // Don't increment conversion stats for partial conversions
      }
    } catch (err) {
      // Log error but continue processing other properties
    }
  }

  /**
   * Checks if a property belongs to one of the selected layers
   * @param {Property} prop - Property to check
   * @param {Layer[]} selectedLayers - Array of selected layers
   * @returns {boolean} True if property is in selected layers
   */
  function isPropertyInSelectedLayers(prop, selectedLayers) {
    if (!prop || !selectedLayers) return false;
    
    try {
      var propLayer = getPropertyLayer(prop);
      if (!propLayer) return false;
      
      for (var i = 0; i < selectedLayers.length; i++) {
        if (selectedLayers[i].index === propLayer.index) {
          return true;
        }
      }
    } catch (err) {
      // Error checking property layer
    }
    
    return false;
  }

  /************************************************************
   * EXPRESSION PARSING AND CONVERSION
   ************************************************************/

  /**
   * Converts an expression string to universal format
   * @param {string} expression - Original expression
   * @param {Property} contextProp - Property containing this expression (for context)
   * @returns {string} Converted universal expression
   */
  function convertExpressionToUniversal(expression, contextProp) {
    var converted = expression;
    
    try {
      // Get the layer containing this property for context
      var contextLayer = getPropertyLayer(contextProp);
      var contextComp = contextLayer ? contextLayer.containingComp : null;

      // Split expression into code and comment parts to avoid converting comments
      var parts = separateCodeFromComments(expression);
      
      // Only convert the non-commented parts
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        
        if (!part.isComment) {
          // 1. Convert transform property references (e.g., transform.position -> (5)(2))
          part.content = convertTransformReferences(part.content, contextLayer);

          // 2. Convert effect property references (e.g., effect("name").param -> effect("name [ue]")(2))
          part.content = convertEffectReferences(part.content, contextLayer);

          // 3. Convert layer references (e.g., thisComp.layer("name") -> thisComp.layer("name [ue]"))
          part.content = convertLayerReferences(part.content, contextComp);

          // 4. Convert mask references (e.g., mask("name") -> mask(1))
          part.content = convertMaskReferences(part.content, contextLayer);
        }
      }

      // Reconstruct the expression
      converted = reconstructExpressionFromParts(parts);

    } catch (err) {
      // If conversion fails, return original expression
      // This ensures we don't break existing expressions
    }

    return converted;
  }

  /**
   * Converts only effect names in expressions (no property indexing or other conversions)
   * @param {string} expression - Original expression
   * @param {Property} contextProp - Property containing this expression (for context)
   * @returns {string} Expression with only effect names converted
   */
  function convertExpressionEffectNamesOnly(expression, contextProp) {
    var converted = expression;
    
    try {
      // Get the layer containing this property for context
      var contextLayer = getPropertyLayer(contextProp);

      // Split expression into code and comment parts to avoid converting comments
      var parts = separateCodeFromComments(expression);
      
      // Only convert the non-commented parts, but ONLY effect names
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        
        if (!part.isComment) {
          // Only convert effect references (no property indexing, no layer references, no mask references)
          part.content = convertEffectNamesOnly(part.content, contextLayer);
        }
      }

      // Reconstruct the expression
      converted = reconstructExpressionFromParts(parts);

    } catch (err) {
      // If conversion fails, return original expression
    }

    return converted;
  }

  /**
   * Converts only effect names to universal format (no property indexing)
   * @param {string} expression - Expression to convert
   * @param {Layer} contextLayer - Layer containing the expression
   * @returns {string} Converted expression
   */
  function convertEffectNamesOnly(expression, contextLayer) {
    if (!contextLayer) return expression;

    var converted = expression;

    try {
      // Simple approach: replace all effect("name") with effect("name [ue]") regardless of context
      var allEffectRegex = /effect\s*\(\s*["']([^"']+)["']\s*\)/g;
      
      converted = converted.replace(allEffectRegex, function(match, effectName) {
        // Don't re-process effects that already have [ue]
        if (effectName.indexOf(CONFIG.CONVERSION.UNIVERSAL_SUFFIX) !== -1) {
          return match;
        }
        
        var universalName = getUniversalEffectName(effectName);
        return 'effect("' + universalName + '")';
      });

      // NOTE: We deliberately do NOT do property indexing here

    } catch (err) {
      // If effect conversion fails, return the original
    }

    return converted;
  }

  /**
   * Gets the layer that contains a given property
   * @param {Property} prop - Property to find layer for
   * @returns {Layer|null} Layer containing the property
   */
  function getPropertyLayer(prop) {
    if (!prop) return null;
    
    var current = prop;
    while (current && current.propertyGroup) {
      try {
        current = current.propertyGroup(current.propertyDepth);
        if (current && current.containingComp) {
          // This is a layer
          return current;
        }
      } catch (e) {
        break;
      }
    }
    return null;
  }

  /**
   * Converts transform property references to index format
   * @param {string} expression - Expression to convert
   * @param {Layer} contextLayer - Layer containing the expression
   * @returns {string} Converted expression
   */
  function convertTransformReferences(expression, contextLayer) {
    if (!contextLayer) return expression;

    var converted = expression;
    
    try {
      // Check if this expression has cross-layer references
      var layerRefMatches = expression.match(/thisComp\.layer\s*\(\s*["']([^"']+)["']\s*\)\s*\.transform\.(\w+)/g);
      
      if (layerRefMatches) {
        // Handle cross-layer transform references
        for (var i = 0; i < layerRefMatches.length; i++) {
          var match = layerRefMatches[i];
          var layerMatch = match.match(/thisComp\.layer\s*\(\s*["']([^"']+)["']\s*\)\s*\.transform\.(\w+)/);
          if (layerMatch) {
            var targetLayerName = layerMatch[1];
            var propName = layerMatch[2];
            
            // Find the target layer
            var targetLayer = findLayerByName(contextLayer.containingComp, targetLayerName);
            if (targetLayer) {
              var targetMappings = getActualTransformMappings(targetLayer);
              if (targetMappings && targetMappings['transform.' + propName]) {
                var replacement = 'thisComp.layer("' + targetLayerName + '")' + targetMappings['transform.' + propName];
                converted = converted.replace(match, replacement);
              }
            }
          }
        }
      }
      
      // Try to get actual property indices from the context layer for local references
      var actualMappings = getActualTransformMappings(contextLayer);
      
      // Fallback to common mappings if we can't get actual indices
      var transformMappings = actualMappings || {
        // Transform group properties (common AE structure)
        'transform.anchorPoint': '(1)(2)',
        'transform.position': '(1)(3)', 
        'transform.scale': '(1)(4)',
        'transform.rotation': '(1)(5)',
        'transform.opacity': '(1)(6)',
        
        // Handle potential variations with dots
        '.transform.anchorPoint': '(1)(2)',
        '.transform.position': '(1)(3)',
        '.transform.scale': '(1)(4)', 
        '.transform.rotation': '(1)(5)',
        '.transform.opacity': '(1)(6)',
        
        // Common shorthand references (when used without transform prefix)
        'anchorPoint': '(1)(2)',
        'position': '(1)(3)',
        'scale': '(1)(4)', 
        'rotation': '(1)(5)',
        'opacity': '(1)(6)',
        
        // Text layer specific properties
        'text.sourceText': '(2)(1)',
        'text.font': '(2)(2)', 
        'text.fontSize': '(2)(3)',
        
        // Shape layer content properties
        'content': '(3)',
        '.content': '(3)'
      };

      // Apply transform mappings with word boundaries to avoid partial matches
      for (var prop in transformMappings) {
        if (transformMappings.hasOwnProperty(prop)) {
          // Use word boundaries for better matching, but handle dots specially
          var pattern = prop.replace(/\./g, '\\.');
          // Create regex that captures the property and any following array access [0], [1], etc.
          var regex = new RegExp('\\b' + pattern + '(\\[[0-9]+\\])?\\b', 'g');
          converted = converted.replace(regex, function(match, arrayAccess) {
            if (arrayAccess) {
              // If there's array access, add thisLayer prefix and append the array access
              return 'thisLayer' + transformMappings[prop] + arrayAccess;
            } else {
              // No array access, add thisLayer prefix for local property references
              return 'thisLayer' + transformMappings[prop];
            }
          });
        }
      }

    } catch (err) {
      // If we can't get mappings, return original expression
    }

    return converted;
  }

  /**
   * Gets actual transform property mappings from a layer
   * @param {Layer} layer - Layer to analyze
   * @returns {Object|null} Mapping object or null if failed
   */
  function getActualTransformMappings(layer) {
    try {
      if (!layer || !layer.property('ADBE Transform Group')) return null;
      
      var transform = layer.property('ADBE Transform Group');
      var mappings = {};
      
      // Try to build mappings for common properties
      var commonProps = [
        { name: 'anchorPoint', matchName: 'ADBE Anchor Point' },
        { name: 'position', matchName: 'ADBE Position' },
        { name: 'scale', matchName: 'ADBE Scale' },
        { name: 'rotation', matchName: 'ADBE Rotate Z' },
        { name: 'opacity', matchName: 'ADBE Opacity' }
      ];
      
      for (var i = 0; i < commonProps.length; i++) {
        var propInfo = commonProps[i];
        var prop = transform.property(propInfo.matchName);
        if (prop) {
          var indexChain = getPropertyIndexChain(prop);
          if (indexChain) {
            mappings['transform.' + propInfo.name] = indexChain;
            mappings[propInfo.name] = indexChain;
            mappings['.' + propInfo.name] = indexChain;
          }
        }
      }
      
      // Check if mappings has any properties (ExtendScript compatible)
      var hasProperties = false;
      for (var key in mappings) {
        if (mappings.hasOwnProperty(key)) {
          hasProperties = true;
          break;
        }
      }
      
      return hasProperties ? mappings : null;
      
    } catch (err) {
      return null;
    }
  }

  /**
   * Converts effect property references to universal format
   * @param {string} expression - Expression to convert
   * @param {Layer} contextLayer - Layer containing the expression
   * @returns {string} Converted expression
   */
  function convertEffectReferences(expression, contextLayer) {
    if (!contextLayer) return expression;

    var converted = expression;

    try {
      // Simple approach: replace all effect("name") with effect("name [ue]") regardless of context
      // This handles both direct calls and layer().effect() calls
      var allEffectRegex = /effect\s*\(\s*["']([^"']+)["']\s*\)/g;
      
      converted = converted.replace(allEffectRegex, function(match, effectName) {
        // Don't re-process effects that already have [ue]
        if (effectName.indexOf(CONFIG.CONVERSION.UNIVERSAL_SUFFIX) !== -1) {
          return match;
        }
        
        var universalName = getUniversalEffectName(effectName);
        return 'effect("' + universalName + '")';
      });

      // Now handle property indexing for effect("name")("property") patterns
      var effectPropRegex = /effect\s*\(\s*["']([^"']+)["']\s*\)\s*\(\s*["']([^"']+)["']\s*\)/g;
      var matches = [];
      var match;
      
      // Store the string to scan for matches (before any modifications)
      var stringToScan = converted;

      // Collect all matches first from the original string (not modified version)
      while ((match = effectPropRegex.exec(stringToScan)) !== null) {
        matches.push({
          fullMatch: match[0],
          effectName: match[1],
          propertyName: match[2],
          matchIndex: match.index
        });
      }

      // Sort matches by index in reverse order to avoid position shifting during replacement
      matches.sort(function(a, b) { return b.matchIndex - a.matchIndex; });

      // Process each match for property indexing (from end to beginning)
      for (var i = 0; i < matches.length; i++) {
        var matchData = matches[i];
        var effectName = matchData.effectName;
        var propertyName = matchData.propertyName;

        // Remove [ue] suffix for property index lookup
        var cleanEffectName = effectName.replace(' ' + CONFIG.CONVERSION.UNIVERSAL_SUFFIX, '');
        
        // Get property index for this effect property
        // For cross-layer references, we need to find the right layer
        var targetLayer = findLayerWithEffect(contextLayer, cleanEffectName, stringToScan, matchData.fullMatch);
        var propertyIndex = getEffectPropertyIndex(targetLayer, cleanEffectName, propertyName);
        
        if (propertyIndex > 0) {
          var replacement = 'effect("' + effectName + '")(' + propertyIndex + ')';
          
          // Use substring replacement to avoid regex state issues
          var beforeMatch = converted.substring(0, matchData.matchIndex);
          var afterMatch = converted.substring(matchData.matchIndex + matchData.fullMatch.length);
          converted = beforeMatch + replacement + afterMatch;
        }
      }

    } catch (err) {
      // If effect conversion fails, return the original
      alert("Error in convertEffectReferences: " + err.toString());
    }

    return converted;
  }

  /**
   * Converts layer references to universal format
   * @param {string} expression - Expression to convert
   * @param {CompItem} contextComp - Composition containing the expression
   * @returns {string} Converted expression
   */
  function convertLayerReferences(expression, contextComp) {
    if (!contextComp) return expression;

    var converted = expression;

    try {
      // Find layer references like thisComp.layer("Layer Name") or comp("Comp Name").layer("Layer Name")
      var layerRegex = /(thisComp|comp\s*\(\s*["'][^"']+["']\s*\))\.layer\s*\(\s*["']([^"']+)["']\s*\)/g;
      
      converted = converted.replace(layerRegex, function(match, compRef, layerName) {
        var universalLayerName = getUniversalLayerName(layerName, contextComp);
        return compRef + '.layer("' + universalLayerName + '")';
      });

    } catch (err) {
      // If layer conversion fails, return original
    }

    return converted;
  }

  /**
   * Converts mask references to index format
   * @param {string} expression - Expression to convert
   * @param {Layer} contextLayer - Layer containing the expression
   * @returns {string} Converted expression
   */
  function convertMaskReferences(expression, contextLayer) {
    if (!contextLayer) return expression;

    var converted = expression;

    try {
      // Find mask references like mask("Mask 1")
      var maskRegex = /mask\s*\(\s*["']([^"']+)["']\s*\)/g;
      
      converted = converted.replace(maskRegex, function(match, maskName) {
        var maskIndex = getMaskIndex(contextLayer, maskName);
        if (maskIndex > 0) {
          return 'mask(' + maskIndex + ')';
        }
        return match; // Return original if index not found
      });

    } catch (err) {
      // If mask conversion fails, return original
    }

    return converted;
  }

  /************************************************************
   * COMMENT HANDLING FUNCTIONS
   ************************************************************/

  /**
   * Separates code from comments in an expression
   * @param {string} expression - Expression to analyze
   * @returns {Array} Array of parts with {content: string, isComment: boolean}
   */
  function separateCodeFromComments(expression) {
    var parts = [];
    var lines = expression.split('\n');
    
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var commentIndex = findCommentStart(line);
      
      if (commentIndex === -1) {
        // No comment in this line
        parts.push({
          content: line,
          isComment: false,
          isNewLine: i > 0
        });
      } else if (commentIndex === 0) {
        // Entire line is a comment
        parts.push({
          content: line,
          isComment: true,
          isNewLine: i > 0
        });
      } else {
        // Line has both code and comment
        var codePart = line.substring(0, commentIndex);
        var commentPart = line.substring(commentIndex);
        
        // Add code part
        parts.push({
          content: codePart,
          isComment: false,
          isNewLine: i > 0
        });
        
        // Add comment part
        parts.push({
          content: commentPart,
          isComment: true,
          isNewLine: false
        });
      }
    }
    
    return parts;
  }

  /**
   * Finds the start of a comment, ignoring // inside strings
   * @param {string} line - Line to search
   * @returns {number} Index of comment start or -1 if none found
   */
  function findCommentStart(line) {
    var inString = false;
    var stringChar = '';
    
    for (var i = 0; i < line.length - 1; i++) {
      var currentChar = line.charAt(i);
      var nextChar = line.charAt(i + 1);
      
      // Handle string boundaries
      if (!inString && (currentChar === '"' || currentChar === "'")) {
        inString = true;
        stringChar = currentChar;
      } else if (inString && currentChar === stringChar && line.charAt(i - 1) !== '\\') {
        inString = false;
        stringChar = '';
      }
      
      // Look for comment start outside of strings
      if (!inString && currentChar === '/' && nextChar === '/') {
        return i;
      }
    }
    
    return -1;
  }

  /**
   * Reconstructs expression from separated parts
   * @param {Array} parts - Array of parts with {content: string, isComment: boolean, isNewLine: boolean}
   * @returns {string} Reconstructed expression
   */
  function reconstructExpressionFromParts(parts) {
    var result = '';
    
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      
      if (part.isNewLine && i > 0) {
        result += '\n';
      }
      
      result += part.content;
    }
    
    return result;
  }

  /************************************************************
   * HELPER FUNCTIONS FOR EXPRESSION CONVERSION
   ************************************************************/

  /**
   * Gets the universal name for an effect (adds suffix if needed)
   * @param {string} effectName - Original effect name
   * @returns {string} Universal effect name
   */
  function getUniversalEffectName(effectName) {
    if (effectName.indexOf(CONFIG.CONVERSION.UNIVERSAL_SUFFIX) !== -1) {
      return effectName; // Already universal
    }

    // Add [ue] suffix to any effect name that doesn't have it
    return effectName + ' ' + CONFIG.CONVERSION.UNIVERSAL_SUFFIX;
  }

  /**
   * Gets the universal name for a layer (adds suffix if needed)
   * @param {string} layerName - Original layer name
   * @param {CompItem} comp - Composition containing the layer
   * @returns {string} Universal layer name
   */
  function getUniversalLayerName(layerName, comp) {
    if (!comp) return layerName;

    if (layerName.indexOf(CONFIG.CONVERSION.UNIVERSAL_SUFFIX) !== -1) {
      return layerName; // Already universal
    }

    // Check if this is a default layer name
    for (var i = 0; i < CONFIG.CONVERSION.DEFAULT_LAYER_NAMES.length; i++) {
      var defaultName = CONFIG.CONVERSION.DEFAULT_LAYER_NAMES[i];
      if (layerName === defaultName || layerName.indexOf(defaultName + ' ') === 0) {
        return layerName + ' ' + CONFIG.CONVERSION.UNIVERSAL_SUFFIX;
      }
    }

    return layerName; // Custom name, keep as-is
  }

  /**
   * Gets the property index for a specific effect property
   * @param {Layer} layer - Layer containing the effect
   * @param {string} effectName - Name of the effect
   * @param {string} propertyName - Name of the property within the effect
   * @returns {number} Property index (0 if not found)
   */
  function getEffectPropertyIndex(layer, effectName, propertyName) {
    if (!layer || !layer.property('ADBE Effect Parade')) return 0;

    try {
      var effectsGroup = layer.property('ADBE Effect Parade');
      
      // Find the effect by name
      for (var i = 1; i <= effectsGroup.numProperties; i++) {
        var effect = effectsGroup.property(i);
        if (!effect) continue;

        var checkName = effect.name;
        // Remove universal suffix for comparison
        if (checkName.indexOf(CONFIG.CONVERSION.UNIVERSAL_SUFFIX) !== -1) {
          checkName = checkName.replace(' ' + CONFIG.CONVERSION.UNIVERSAL_SUFFIX, '');
        }

        if (checkName === effectName) {
          // Found the effect, now find the property
          for (var j = 1; j <= effect.numProperties; j++) {
            var prop = effect.property(j);
            if (prop && prop.name === propertyName) {
              return j;
            }
          }
          break;
        }
      }
    } catch (err) {
      // Effect or property not found
    }

    return 0;
  }

  /**
   * Gets the index of a mask by name
   * @param {Layer} layer - Layer containing the mask
   * @param {string} maskName - Name of the mask
   * @returns {number} Mask index (0 if not found)
   */
  function getMaskIndex(layer, maskName) {
    if (!layer || !layer.property('ADBE Mask Parade')) return 0;

    try {
      var masksGroup = layer.property('ADBE Mask Parade');
      
      for (var i = 1; i <= masksGroup.numProperties; i++) {
        var mask = masksGroup.property(i);
        if (mask && mask.name === maskName) {
          return i;
        }
      }
    } catch (err) {
      // Mask not found
    }

    return 0;
  }

  /**
   * Finds the layer that contains a specific effect for cross-layer references
   * @param {Layer} contextLayer - Layer containing the expression
   * @param {string} effectName - Name of the effect to find
   * @param {string} fullExpression - Full expression context
   * @param {string} effectMatch - The specific effect match
   * @returns {Layer} Layer containing the effect
   */
  function findLayerWithEffect(contextLayer, effectName, fullExpression, effectMatch) {
    if (!contextLayer || !effectName) return contextLayer;

    try {
      // Look for layer reference in the full expression context around the effect match
      var effectIndex = fullExpression.indexOf(effectMatch);
      
      if (effectIndex > 0) {
        // Get some context before the effect match
        var contextBefore = fullExpression.substring(Math.max(0, effectIndex - 50), effectIndex + effectMatch.length);
        
        // Check if this is a cross-layer reference like thisComp.layer("name").effect("effect")
        var layerRefMatch = contextBefore.match(/layer\s*\(\s*["']([^"']+)["']\s*\)\.effect/);
        
        if (layerRefMatch) {
          // This is a cross-layer reference
          var targetLayerName = layerRefMatch[1];
          var comp = contextLayer.containingComp;
          
          if (comp) {
            // Find the target layer by name
            for (var i = 1; i <= comp.numLayers; i++) {
              var layer = comp.layer(i);
              if (layer && layer.name === targetLayerName) {
                return layer;
              }
            }
          }
        }
      }
      
      // If not a cross-layer reference or target not found, use context layer
      return contextLayer;
      
    } catch (err) {
      // If anything fails, fall back to context layer
      return contextLayer;
    }
  }


  /**
   * Escapes special regex characters in a string
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Gets the property index chain for a given property
   * @param {Property} prop - Property to get index chain for
   * @returns {string} Index chain string like "(5)(2)"
   */
  function getPropertyIndexChain(prop) {
    if (!prop) return '';

    var indexChain = '';
    var currentProp = prop;
    var failed = false;
    var depth = 0;

    // Build the index chain from the property up to its root
    while (!failed && depth < 20) { // Safety limit to prevent infinite loops
      try {
        var propIndex = currentProp.propertyIndex;
        if (propIndex === undefined || propIndex === null) {
          failed = true;
          break;
        }
        indexChain = '(' + propIndex + ')' + indexChain;
        currentProp = currentProp.propertyGroup(1);
        if (!currentProp) {
          failed = true;
        }
        depth++;
      } catch (e) {
        failed = true;
      }
    }

    return indexChain;
  }

  /************************************************************
   * NAMING FUNCTIONS
   ************************************************************/

  /**
   * Universalizes a layer name by adding suffix if it's a default name
   * @param {Layer} layer - Layer to universalize
   */
  function universalizeLayerName(layer) {
    if (!layer || !layer.name) return;

    var layerName = layer.name;
    
    // Skip if already has universal suffix
    if (layerName.indexOf(CONFIG.CONVERSION.UNIVERSAL_SUFFIX) !== -1) {
      return;
    }

    // Check if this is a default layer name that needs universalizing
    var needsUniversalizing = false;
    
    for (var i = 0; i < CONFIG.CONVERSION.DEFAULT_LAYER_NAMES.length; i++) {
      var defaultName = CONFIG.CONVERSION.DEFAULT_LAYER_NAMES[i];
      if (layerName === defaultName || 
          layerName.indexOf(defaultName + ' ') === 0) {
        needsUniversalizing = true;
        break;
      }
    }

    if (needsUniversalizing) {
      layer.name = layerName + ' ' + CONFIG.CONVERSION.UNIVERSAL_SUFFIX;
      conversionStats.layersRenamed++;
    }
  }

  /**
   * Universalizes effect names in an effects property group
   * @param {PropertyGroup} effectsGroup - Effects property group
   */
  function universalizeEffectNames(effectsGroup) {
    if (!effectsGroup || !effectsGroup.numProperties) return;

    for (var i = 1; i <= effectsGroup.numProperties; i++) {
      try {
        var effect = effectsGroup.property(i);
        if (!effect || !effect.name) continue;

        var effectName = effect.name;
        
        // Skip if already has universal suffix
        if (effectName.indexOf(CONFIG.CONVERSION.UNIVERSAL_SUFFIX) !== -1) {
          continue;
        }

        // Add [ue] suffix to any effect that doesn't already have it
        effect.name = effectName + ' ' + CONFIG.CONVERSION.UNIVERSAL_SUFFIX;
        conversionStats.effectsRenamed++;
      } catch (err) {
        // Skip inaccessible effects
      }
    }
  }

  /**
   * Universalizes effect names for a specific layer
   * @param {Layer} layer - Layer to universalize effect names for
   */
  function universalizeLayerEffectNames(layer) {
    if (!layer) return;

    try {
      var effectsGroup = layer.property('ADBE Effect Parade');
      if (effectsGroup) {
        universalizeEffectNames(effectsGroup);
      }
    } catch (err) {
      // Effects group not accessible or doesn't exist
    }
  }

  /************************************************************
   * DEPENDENCY-AWARE CONVERSION HELPERS
   ************************************************************/

  /**
   * Gets layers that contain selected properties
   * @param {Layer[]} selectedLayers - Array of selected layers
   * @returns {Layer[]} Array of layers with selected properties
   */
  function getLayersWithSelectedProperties(selectedLayers) {
    var affectedLayers = [];
    
    for (var i = 0; i < selectedLayers.length; i++) {
      var layer = selectedLayers[i];
      if (hasSelectedProperties(layer)) {
        affectedLayers.push(layer);
      }
    }
    
    return affectedLayers;
  }

  /**
   * Finds layers referenced by expressions in selected properties only
   * @param {Layer[]} selectedLayers - Layers with selected properties
   * @returns {Layer[]} Array of referenced layers
   */
  function findReferencedLayersInSelectedProperties(selectedLayers) {
    var referencedLayers = [];
    var layerNames = {};
    
    for (var i = 0; i < selectedLayers.length; i++) {
      var layer = selectedLayers[i];
      var referencedNames = findLayerReferencesInSelectedProperties(layer);
      
      for (var j = 0; j < referencedNames.length; j++) {
        var layerName = referencedNames[j];
        if (!layerNames[layerName]) {
          layerNames[layerName] = true;
          
          // Find the actual layer object
          var referencedLayer = findLayerByName(layer.containingComp, layerName);
          if (referencedLayer) {
            referencedLayers.push(referencedLayer);
          }
        }
      }
    }
    
    return referencedLayers;
  }

  /**
   * Finds layer references in selected properties of a layer
   * @param {Layer} layer - Layer to search
   * @returns {string[]} Array of referenced layer names
   */
  function findLayerReferencesInSelectedProperties(layer) {
    var referencedNames = [];
    var foundNames = {};
    
    findLayerReferencesInSelectedPropertiesItem(layer, referencedNames, foundNames);
    
    return referencedNames;
  }

  /**
   * Recursively finds layer references in selected properties only
   * @param {PropertyGroup|Layer} item - Item to search
   * @param {string[]} referencedNames - Array to collect results
   * @param {Object} foundNames - Object to track found names
   */
  function findLayerReferencesInSelectedPropertiesItem(item, referencedNames, foundNames) {
    if (!item || !item.numProperties) return;
    
    for (var i = 1; i <= item.numProperties; i++) {
      try {
        var prop = item.property(i);
        if (!prop) continue;
        
        if (prop.propertyType === PropertyType.PROPERTY && prop.selected) {
          // Only process selected properties
          if (prop.expressionEnabled && prop.expression && prop.canSetExpression) {
            var layerRefs = extractLayerReferences(prop.expression);
            for (var j = 0; j < layerRefs.length; j++) {
              var layerName = layerRefs[j];
              if (!foundNames[layerName]) {
                foundNames[layerName] = true;
                referencedNames.push(layerName);
              }
            }
          }
        }
        
        if (prop.propertyType === PropertyType.INDEXED_GROUP || 
            prop.propertyType === PropertyType.NAMED_GROUP) {
          // Recursively search property groups
          findLayerReferencesInSelectedPropertiesItem(prop, referencedNames, foundNames);
        }
      } catch (err) {
        // Skip inaccessible properties
      }
    }
  }

  /**
   * Finds all layers referenced by expressions in the given layers
   * @param {Layer[]} layers - Layers to analyze
   * @returns {Layer[]} Array of referenced layers
   */
  function findAllReferencedLayers(layers) {
    var referencedLayers = [];
    var layerNames = {};
    
    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      var referencedNames = findLayerReferencesInLayer(layer);
      
      for (var j = 0; j < referencedNames.length; j++) {
        var layerName = referencedNames[j];
        if (!layerNames[layerName]) {
          layerNames[layerName] = true;
          
          // Find the actual layer object
          var referencedLayer = findLayerByName(layer.containingComp, layerName);
          if (referencedLayer) {
            referencedLayers.push(referencedLayer);
          }
        }
      }
    }
    
    return referencedLayers;
  }

  /**
   * Merges two arrays of layers, removing duplicates
   * @param {Layer[]} layers1 - First array of layers
   * @param {Layer[]} layers2 - Second array of layers
   * @returns {Layer[]} Merged array without duplicates
   */
  function mergeLayers(layers1, layers2) {
    var merged = [];
    var layerIds = {};
    
    // Add layers from first array
    for (var i = 0; i < layers1.length; i++) {
      var layer = layers1[i];
      if (!layerIds[layer.index]) {
        layerIds[layer.index] = true;
        merged.push(layer);
      }
    }
    
    // Add layers from second array (avoiding duplicates)
    for (var i = 0; i < layers2.length; i++) {
      var layer = layers2[i];
      if (!layerIds[layer.index]) {
        layerIds[layer.index] = true;
        merged.push(layer);
      }
    }
    
    return merged;
  }

  /**
   * Finds layer names referenced in expressions within a layer
   * @param {Layer} layer - Layer to analyze
   * @returns {string[]} Array of referenced layer names
   */
  function findLayerReferencesInLayer(layer) {
    var referencedNames = [];
    var foundNames = {};
    
    findLayerReferencesInItem(layer, referencedNames, foundNames);
    
    return referencedNames;
  }

  /**
   * Recursively finds layer references in expressions
   * @param {PropertyGroup|Layer} item - Item to search
   * @param {string[]} referencedNames - Array to collect results
   * @param {Object} foundNames - Object to track found names
   */
  function findLayerReferencesInItem(item, referencedNames, foundNames) {
    if (!item || !item.numProperties) return;

    for (var i = 1; i <= item.numProperties; i++) {
      try {
        var prop = item.property(i);
        if (!prop) continue;

        if (prop.propertyType === PropertyType.PROPERTY) {
          if (prop.expressionEnabled && prop.expression && prop.canSetExpression) {
            var layerRefs = extractLayerReferences(prop.expression);
            for (var j = 0; j < layerRefs.length; j++) {
              var layerName = layerRefs[j];
              if (!foundNames[layerName]) {
                foundNames[layerName] = true;
                referencedNames.push(layerName);
              }
            }
          }
        } else if (prop.propertyType === PropertyType.INDEXED_GROUP || 
                   prop.propertyType === PropertyType.NAMED_GROUP) {
          findLayerReferencesInItem(prop, referencedNames, foundNames);
        }
      } catch (err) {
        // Skip inaccessible properties
      }
    }
  }

  /**
   * Extracts layer names from expression text
   * @param {string} expression - Expression to analyze
   * @returns {string[]} Array of layer names
   */
  function extractLayerReferences(expression) {
    var layerNames = [];
    
    // Find thisComp.layer("name") and comp("name").layer("name") patterns
    var layerRegex = /(thisComp|comp\s*\(\s*["'][^"']*["']\s*\))\.layer\s*\(\s*["']([^"']+)["']\s*\)/g;
    var match;
    
    while ((match = layerRegex.exec(expression)) !== null) {
      layerNames.push(match[2]);
    }
    
    return layerNames;
  }

  /**
   * Finds a layer by name in a composition
   * @param {CompItem} comp - Composition to search
   * @param {string} layerName - Name of layer to find
   * @returns {Layer|null} Found layer or null
   */
  function findLayerByName(comp, layerName) {
    if (!comp) return null;
    
    try {
      for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        if (layer && layer.name === layerName) {
          return layer;
        }
      }
    } catch (err) {
      // Layer not found
    }
    
    return null;
  }

  /**
   * Universalizes layer name and tracks the change
   * @param {Layer} layer - Layer to universalize
   */
  function universalizeLayerNameWithTracking(layer) {
    if (!layer || !layer.name) return;

    var originalName = layer.name;
    
    // Skip if already has universal suffix
    if (originalName.indexOf(CONFIG.CONVERSION.UNIVERSAL_SUFFIX) !== -1) {
      return;
    }

    // Check if this is a default layer name that needs universalizing
    var needsUniversalizing = false;
    
    for (var i = 0; i < CONFIG.CONVERSION.DEFAULT_LAYER_NAMES.length; i++) {
      var defaultName = CONFIG.CONVERSION.DEFAULT_LAYER_NAMES[i];
      if (originalName === defaultName || 
          originalName.indexOf(defaultName + ' ') === 0) {
        needsUniversalizing = true;
        break;
      }
    }

    if (needsUniversalizing) {
      var newName = originalName + ' ' + CONFIG.CONVERSION.UNIVERSAL_SUFFIX;
      layer.name = newName;
      renamedLayers[originalName] = newName;
      conversionStats.layersRenamed++;
    }
  }

  /**
   * Universalizes effect names and tracks changes
   * @param {Layer} layer - Layer to universalize effect names for
   */
  function universalizeLayerEffectNamesWithTracking(layer) {
    if (!layer) return;

    try {
      var effectsGroup = layer.property('ADBE Effect Parade');
      if (effectsGroup) {
        universalizeEffectNamesWithTracking(effectsGroup, layer.name);
      }
    } catch (err) {
      // Effects group not accessible or doesn't exist
    }
  }

  /**
   * Universalizes effect names and tracks changes
   * @param {PropertyGroup} effectsGroup - Effects property group
   * @param {string} layerName - Name of the layer containing these effects
   */
  function universalizeEffectNamesWithTracking(effectsGroup, layerName) {
    if (!effectsGroup || !effectsGroup.numProperties) return;

    // Initialize tracking for this layer if needed
    if (!renamedEffects[layerName]) {
      renamedEffects[layerName] = {};
    }

    for (var i = 1; i <= effectsGroup.numProperties; i++) {
      try {
        var effect = effectsGroup.property(i);
        if (!effect || !effect.name) continue;

        var originalName = effect.name;
        
        // Skip if already has universal suffix
        if (originalName.indexOf(CONFIG.CONVERSION.UNIVERSAL_SUFFIX) !== -1) {
          continue;
        }

        // Add [ue] suffix to any effect that doesn't already have it
        var newName = originalName + ' ' + CONFIG.CONVERSION.UNIVERSAL_SUFFIX;
        effect.name = newName;
        
        // Track the rename
        renamedEffects[layerName][originalName] = newName;
        conversionStats.effectsRenamed++;
        
      } catch (err) {
        // Skip inaccessible effects
      }
    }
  }

  /**
   * Finds all expressions in a composition that reference renamed layers/effects
   * @param {CompItem} comp - Composition to search
   * @returns {Property[]} Array of properties with dependent expressions
   */
  function findDependentExpressionsInComp(comp) {
    var dependentProperties = [];
    
    for (var layerIndex = 1; layerIndex <= comp.numLayers; layerIndex++) {
      var layer = comp.layer(layerIndex);
      var layerDependents = findDependentExpressionsInLayer(layer);
      
      for (var i = 0; i < layerDependents.length; i++) {
        dependentProperties.push(layerDependents[i]);
      }
    }
    
    return dependentProperties;
  }

  /**
   * Finds expressions in a layer that reference renamed items
   * @param {Layer} layer - Layer to search
   * @returns {Property[]} Array of properties with dependent expressions
   */
  function findDependentExpressionsInLayer(layer) {
    var dependentProperties = [];
    
    findDependentExpressionsInItem(layer, dependentProperties);
    
    return dependentProperties;
  }

  /**
   * Recursively finds expressions that reference renamed items
   * @param {PropertyGroup|Layer} item - Item to search
   * @param {Property[]} dependentProperties - Array to collect results
   */
  function findDependentExpressionsInItem(item, dependentProperties) {
    if (!item || !item.numProperties) return;

    for (var i = 1; i <= item.numProperties; i++) {
      try {
        var prop = item.property(i);
        if (!prop) continue;

        if (prop.propertyType === PropertyType.PROPERTY) {
          // Check if this property has an expression that references renamed items
          if (prop.expressionEnabled && prop.expression && prop.canSetExpression) {
            if (expressionReferencesRenamedItems(prop.expression)) {
              dependentProperties.push(prop);
              // Expression references renamed items
            }
          }
        } else if (prop.propertyType === PropertyType.INDEXED_GROUP || 
                   prop.propertyType === PropertyType.NAMED_GROUP) {
          // Recursively search property groups
          findDependentExpressionsInItem(prop, dependentProperties);
        }
      } catch (err) {
        // Skip inaccessible properties
      }
    }
  }

  /**
   * Checks if an expression references any renamed layers or effects
   * @param {string} expression - Expression to check
   * @returns {boolean} True if expression references renamed items
   */
  function expressionReferencesRenamedItems(expression) {
    // Check for layer references
    for (var oldLayerName in renamedLayers) {
      if (renamedLayers.hasOwnProperty(oldLayerName)) {
        var layerRefPattern = 'layer\\s*\\(\\s*["\']' + escapeRegExp(oldLayerName) + '["\']\\s*\\)';
        var layerRegex = new RegExp(layerRefPattern);
        if (layerRegex.test(expression)) {
          return true;
        }
      }
    }

    // Check for effect references
    for (var layerName in renamedEffects) {
      if (renamedEffects.hasOwnProperty(layerName)) {
        var effectMap = renamedEffects[layerName];
        for (var oldEffectName in effectMap) {
          if (effectMap.hasOwnProperty(oldEffectName)) {
            var effectRefPattern = 'effect\\s*\\(\\s*["\']' + escapeRegExp(oldEffectName) + '["\']\\s*\\)';
            var effectRegex = new RegExp(effectRefPattern);
            if (effectRegex.test(expression)) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  /************************************************************
   * UTILITY FUNCTIONS
   ************************************************************/

  /**
   * Gets all compositions in the project
   * @returns {CompItem[]} Array of compositions
   */
  function getProjectCompositions() {
    var compositions = [];
    
    if (!app.project) return compositions;

    for (var i = 1; i <= app.project.items.length; i++) {
      var item = app.project.items[i];
      if (item instanceof CompItem) {
        compositions.push(item);
      }
    }

    return compositions;
  }

  /**
   * Resets conversion statistics and tracking data
   */
  function resetConversionStats() {
    conversionStats.expressionsConverted = 0;
    conversionStats.layersRenamed = 0;
    conversionStats.effectsRenamed = 0;
    renamedEffects = {};
    renamedLayers = {};
  }

  /**
   * Validates that a project is open and accessible
   * @returns {boolean} True if project state is valid
   */
  function validateProjectState() {
    if (!app.project) {
      alert(CONFIG.ALERT.NO_PROJECT);
      return false;
    }

    return true;
  }

  // Initialize the script
  init();
})(this);