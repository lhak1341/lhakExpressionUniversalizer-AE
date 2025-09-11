# lhakExpressionUniversalizer - Developer Documentation

Converts After Effects expressions between English and universal index-based format for cross-language compatibility. Universal expressions use property indices (5)(2) instead of property names (transform.position) to work consistently across different After Effects language versions.

**Script Type**: ScriptUI Panel
**Development Status**: Production

## Development Setup

### Key Files

- **Main Entry Point**: `lhakExpressionUniversalizer.jsx`
- **Development Location**: `C:\Users\khoa.le\OneDrive - Spring Family ApS\_jsx\lhakExpressionUniversalizer\`
- **Installation Location**: After Effects Scripts folder
- **Reference Examples**: `reference/` folder contains pattern analysis scripts

## Script Architecture

### Main Components

- **UI System** (lines 190-250): Compact 260×100px interface with scope dropdown and action buttons
- **Conversion Engine** (lines 840-1100): Bidirectional expression parsing and property indexing
- **Dependency Tracker** (lines 1580-1650): Cross-layer reference detection and scope-aware processing
- **Property Mapper** (lines 1400-1500): Dynamic property index resolution using AE object model

### Processing Flow

```
User Input → Scope Detection → Dependency Analysis → Effect Renaming → Expression Conversion → Validation → Undo Group Completion
```

**Universalize**: `transform.position` → `(1)(3)`, `effect("Blur")("Amount")` → `effect("Blur [ue]")(1)`
**De-Universalize**: `(1)(3)` → `transform.position`, `effect("Blur [ue]")(1)` → `effect("Blur [ue]")("Amount")`

### External Dependencies

- After Effects ExtendScript API (PropertyGroup, Layer, CompItem objects)
- ScriptUI framework for interface
- No external files or network dependencies required

## Architecture Decisions & Workflow Assumptions

### Key Design Decisions

- **Scope-Strict Conversion**: Only selected items get full property indexing conversion

  - **Rationale**: Prevents unintended modifications outside user's selection scope
  - **Assumption**: Users want precise control over which expressions are modified
  - **Example**: Converting selected position property updates only that property and renames referenced effects for compatibility

- **Two-Phase Dependency Processing**: Effect renaming happens before expression conversion

  - **Rationale**: Cross-layer references break if target effects aren't renamed first
  - **Assumption**: Expressions reference effects by name, not by index position
  - **Example**: Layer A references Layer B's effect - Layer B's effect gets renamed before Layer A's expression is converted

- **Effect Name Universalization**: Adds "[ue]" suffix to all effects, not just defaults
  - **Rationale**: Simpler implementation than maintaining comprehensive default effect databases
  - **Assumption**: "[ue]" suffix doesn't conflict with existing user naming patterns
  - **Example**: "Blur" becomes "Blur [ue]", "My Custom Effect" becomes "My Custom Effect [ue]"

### Workflow-Specific Optimizations

- **Comment-Aware Parsing**: Expressions are tokenized to avoid converting commented code

  - **Implementation**: `separateCodeFromComments()` creates comment/code segments before conversion
  - **Risk**: Complex comment patterns (nested, multi-line) may cause parsing failures

- **Dynamic Property Index Lookup**: Uses actual layer structure instead of hardcoded mappings
  - **Implementation**: `getPropertyIndexChain()` traverses propertyGroup hierarchy at runtime
  - **Risk**: Script performance degrades with deeply nested property groups (>20 levels)

### Performance Trade-offs

- **Memory vs Speed**: Caches property mappings per layer during processing

  - **Benefit**: Eliminates redundant property traversal for multiple expressions in same layer
  - **Limitation**: High memory usage with projects containing 500+ layers

- **Accuracy vs Robustness**: Uses fallback mappings when dynamic lookup fails
  - **Benefit**: Script continues working even with inaccessible properties
  - **Limitation**: May produce incorrect indices for non-standard layer configurations

## Workflow Standards & Conventions

### Expected Project Structure

```
After Effects Project
├── Compositions/
│   ├── Main_Comp
│   └── Precomp_Sequences
├── Layers/
│   ├── Text Layers (expressions for animation)
│   ├── Shape Layers (property references)
│   └── Null Objects (controller expressions)
└── Effects/
    ├── Standard Effects (Blur, Transform, etc.)
    └── Custom Effects (user-named)
```

### Expression Naming Conventions

- **Property References**: `transform.position`, `transform.scale`, `text.sourceText`

  - **Pattern**: `propertyGroup.propertyName` format
  - **Example**: `thisComp.layer("Layer 1").transform.position`
  - **Script Dependency**: Regex patterns match this exact dot notation

- **Effect References**: `effect("Effect Name")("Property Name")`
  - **Pattern**: Double parentheses with quoted names
  - **Example**: `effect("Gaussian Blur")("Blurriness")`
  - **Script Dependency**: Pattern matching assumes quoted strings, not variables

### Layer Organization Standards

- **Cross-Layer References**: Layers reference other layers by exact name match
  - **Implementation**: `findLayerByName()` uses string comparison for layer lookup
  - **Validation**: Script warns when referenced layers don't exist

## Critical Constraints & Gotchas

### After Effects Limitations

- **ExtendScript Object Model**: No Object.keys() support - must use traditional for...in loops
- **Property Index Stability**: Property indices change when effects are added/removed/reordered
- **Layer Name Case Sensitivity**: "Layer 1" vs "layer 1" are different layers
- **Expression Length Limits**: AE expressions have ~10KB character limits

### Performance Boundaries

- **Layer Count**: Tested up to 1000 layers without UI blocking
- **Expression Complexity**: Handles expressions up to 5KB characters
- **Undo Group Size**: Single undo operation for entire conversion regardless of scope

### Known Issues

- **Shape Content Indexing**: Deliberately excluded - shape structure too variable across projects
- **Cross-Composition References**: Only processes layers within same composition
- **Unicode Effect Names**: Non-ASCII characters in effect names may cause regex matching failures

## Development Guidelines

### Error Handling Pattern

```javascript
try {
  app.beginUndoGroup('Convert to Universal Expressions - ' + scope);
  // Main processing logic
  resetConversionStats();
  convertSelectedProperties();
  showSuccessMessage();
} catch (error) {
  alert('Error: ' + error.toString());
} finally {
  app.endUndoGroup();
}
```

### Code Organization

- **UI Functions** (190-280): Interface building and event handling
- **Conversion Functions** (380-620): Core universalize/de-universalize logic
- **Property Functions** (840-1100): Property traversal and indexing
- **Utility Functions** (1950-2100): String manipulation and helper methods

### Debugging Approach

- **ExtendScript Toolkit**: Use ESTK for step-through debugging
- **Console Output**: `$.writeln()` for debugging (removed in production)
- **Test Project**: Create simple comp with various layer/effect configurations

## Current Features & Limitations

### Supported Expression Types

- ✅ **Transform Properties**: position, scale, rotation, opacity, anchorPoint
- ✅ **Effect Properties**: All effect properties with dynamic name lookup
- ✅ **Cross-Layer References**: thisComp.layer("name").property chains
- ✅ **Text Properties**: sourceText, font, fontSize (basic support)
- ❌ **Shape Content**: Excluded due to variable structure complexity
- ❌ **3D Camera/Light**: Not yet implemented (planned future feature)

### Processing Capabilities

- **Bidirectional Conversion**: English ↔ Universal format with full round-trip capability
- **Scope-Aware Processing**: Four conversion scopes (Properties, Layers, Comp, All Comps)
- **Dependency Tracking**: Automatically handles cross-layer effect references
- **Comment Preservation**: Maintains code comments unchanged during conversion

### Current Limitations

- **Shape Layer Content**: Property indexing not supported - names too variable across projects
- **Composition References**: Only processes layers within single composition boundary
- **Effect Parameter Groups**: Nested effect properties may not convert correctly

## AE Integration Details

### Object Model Usage

- **Primary**: PropertyGroup.property(), Property.propertyIndex, Layer.containingComp
- **Secondary**: CompItem.selectedLayers, Property.expression, PropertyType constants

### Undo Group Handling

Single undo operation wraps entire conversion process regardless of scope size. Users can undo complete conversion with Ctrl+Z.

### Progress Indication

No progress bar - conversions complete quickly (<2 seconds for typical projects). Success message shows conversion statistics.

### File System Access

None - script operates entirely within AE project memory. No external files read or written.

## User Workflow Context

### What Users Do With This Script

- **Primary Use**: Convert English expressions before sharing projects internationally
- **Secondary Use**: Convert received universal expressions back to readable English format
- **Timing**: Typically run before project delivery or when receiving international projects

### Expected User Behavior

- **Selection-First Workflow**: Users select specific properties/layers before conversion
- **Scope Escalation**: Start with selected properties, escalate to layers/comps if needed
- **Round-Trip Usage**: Convert to universal for sharing, then back to English for editing

## Development Tasks

### Adding New Property Types

- **Location**: Extend `getActualTransformMappings()` and `getReversePropertyMappings()`
- **Pattern**: Add new property matchNames and index chains to mapping objects
- **Testing**: Verify property indices match AE's actual structure

### Modifying Conversion Logic

- **Core Functions**: `convertExpressionToUniversal()` and `convertUniversalToNormal()`
- **Safety**: Always test with undo group to prevent project corruption
- **Validation**: Ensure bidirectional conversion maintains expression equivalence

### Debugging Expression Issues

- **Method**: Use `separateCodeFromComments()` to isolate problematic expression segments
- **Tools**: ExtendScript Toolkit with breakpoints in regex replacement functions
- **Test Cases**: Create expressions with edge cases (nested quotes, special characters)

### Deployment

- **Team Distribution**: Copy `.jsx` file to After Effects Scripts folder
- **Version Management**: Update CONFIG.META.VERSION string for tracking
- **Compatibility**: Test on different AE versions (2020, 2021, 2022+)

## Expression Pattern Recognition

### Transform Property Patterns

**Recognition Methodology**: Systematic identification of property reference structures

```javascript
// Standard patterns detected:
transform.position     → (1)(3)  // Transform group property 3
transform.scale        → (1)(4)  // Transform group property 4
transform.rotation     → (1)(5)  // Transform group property 5

// Cross-layer patterns:
thisComp.layer("name").transform.position → thisComp.layer("name")(1)(3)
```

**Diagnostic Steps**:

1. **Pattern Isolation**: Extract property reference from full expression context
2. **Layer Context**: Determine if reference is local or cross-layer
3. **Property Traversal**: Walk property hierarchy to build index chain
4. **Validation**: Verify index chain resolves back to correct property

### Effect Reference Patterns

**Recognition Framework**: Systematic approach to effect property identification

```javascript
// Local effect patterns:
effect("Blur")("Amount")           → effect("Blur [ue]")(1)
effect("Transform")("Position")    → effect("Transform [ue]")(3)

// Cross-layer effect patterns:
thisComp.layer("Controller").effect("Slider Control")("Slider")
→ thisComp.layer("Controller").effect("Slider Control [ue]")(1)
```

**Common Failure Patterns**:

- **Effect Name Mismatches**: Script looks for exact name match, fails with renamed effects
- **Property Index Shifts**: Adding/removing effect properties changes subsequent indices
- **Nested Effect Groups**: Complex effects with grouped properties may not convert correctly

**Diagnostic Questions**:

1. **Does effect exist on layer?** Check layer.property('ADBE Effect Parade') enumeration
2. **Is effect name exact match?** Verify no [ue] suffix or extra spacing in original name
3. **Is property index valid?** Confirm property exists at specified index within effect

### Dependency Chain Recognition

**When Cross-Layer References Fail**: Systematic diagnosis for dependency issues

**Step 1: Trace Reference Chain**

```javascript
// Test each dependency link independently
console.log('1. Source layer exists:', findLayerByName(comp, sourceName));
console.log('2. Target layer exists:', findLayerByName(comp, targetName));
console.log(
  '3. Effect exists on target:',
  targetLayer.property('ADBE Effect Parade')
);
console.log('4. Property exists in effect:', effect.property(propertyIndex));
```

**Step 2: Verify Scope Processing**

- **Selected Scope**: Are referenced layers included in selected scope?
- **Dependency Detection**: Did `findAllReferencedLayers()` identify all dependencies?
- **Processing Order**: Were effects renamed before expressions converted?

**Common Dependency Issues**:

- **Missing References**: Referenced layers not found in composition
- **Timing Problems**: Effects converted before dependencies are renamed
- **Scope Conflicts**: Referenced items outside selected conversion scope

## Memory Management Patterns

### Property Traversal Optimization

**Pattern**: Cache property mappings per layer to avoid redundant traversals

```javascript
// Instead of: Re-traverse properties for each expression
for (each expression in layer) {
    var mappings = getActualTransformMappings(layer); // Expensive traversal
    convertExpression(expression, mappings);
}

// Use: Single traversal with cached mappings
var layerMappings = getActualTransformMappings(layer); // Once per layer
for (each expression in layer) {
    convertExpression(expression, layerMappings); // Reuse mappings
}
```

**Benefits**: 60% performance improvement with layers containing 10+ expressions
**Trade-off**: Higher memory usage, but prevents UI blocking in large projects

### Expression Parsing State Management

**Pattern**: Segment expressions before processing to avoid regex conflicts

```javascript
// Problem: Global regex replacements interfere with each other
expression = expression.replace(/pattern1/g, replacement1);
expression = expression.replace(/pattern2/g, replacement2); // May conflict with replacement1

// Solution: Parse segments first, then process independently
var parts = separateCodeFromComments(expression);
for (var i = 0; i < parts.length; i++) {
  if (!parts[i].isComment) {
    parts[i].content = applyAllReplacements(parts[i].content);
  }
}
var result = reconstructExpressionFromParts(parts);
```

**Prevention Strategy**: Always segment complex expressions before applying multiple transformations
