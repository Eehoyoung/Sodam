/**
 * Debug script to add comprehensive logging to useJSISafeDimensions hook
 * This will help trace exactly where the ReferenceError is occurring
 */

const fs = require('fs');
const path = require('path');

console.log('[DEBUG_LOG] === ADDING DEBUG LOGS TO useJSISafeDimensions HOOK ===');

const hookPath = path.join(__dirname, 'src', 'hooks', 'useJSISafeDimensions.ts');

try {
    const originalContent = fs.readFileSync(hookPath, 'utf8');
    console.log('[DEBUG_LOG] ✅ Original hook file read successfully');

    // Create debug version with extensive logging
    const debugContent = originalContent.replace(
        'export const useJSISafeDimensions = (): JSISafeDimensions => {',
        `export const useJSISafeDimensions = (): JSISafeDimensions => {
  console.log('[DEBUG_LOG] useJSISafeDimensions: Hook execution started');
  
  try {`
    ).replace(
        '  // Cache raw dimensions first to prevent JSI violations\n  const rawDimensions = useMemo(() => {',
        `    // Cache raw dimensions first to prevent JSI violations
    console.log('[DEBUG_LOG] useJSISafeDimensions: About to create rawDimensions useMemo');
    const rawDimensions = useMemo(() => {
      console.log('[DEBUG_LOG] useJSISafeDimensions: Inside rawDimensions useMemo callback');
      try {`
    ).replace(
        '    const { width, height } = Dimensions.get(\'window\');\n    return { width, height };',
        `        console.log('[DEBUG_LOG] useJSISafeDimensions: About to call Dimensions.get("window")');
        const { width, height } = Dimensions.get('window');
        console.log('[DEBUG_LOG] useJSISafeDimensions: Got dimensions:', { width, height });
        return { width, height };
      } catch (error) {
        console.error('[DEBUG_LOG] useJSISafeDimensions: ERROR in rawDimensions:', error);
        throw error;
      }`
    ).replace(
        '  }, []);',
        `    }, []);
    console.log('[DEBUG_LOG] useJSISafeDimensions: rawDimensions created successfully:', rawDimensions);`
    ).replace(
        '  // Cache screen dimensions using raw dimensions\n  const dimensions = useMemo((): ScreenDimensions => {',
        `    // Cache screen dimensions using raw dimensions
    console.log('[DEBUG_LOG] useJSISafeDimensions: About to create dimensions useMemo');
    const dimensions = useMemo((): ScreenDimensions => {
      console.log('[DEBUG_LOG] useJSISafeDimensions: Inside dimensions useMemo callback');
      try {`
    ).replace(
        '    const { width, height } = rawDimensions;\n\n    return {',
        `        console.log('[DEBUG_LOG] useJSISafeDimensions: Accessing rawDimensions:', rawDimensions);
        const { width, height } = rawDimensions;
        console.log('[DEBUG_LOG] useJSISafeDimensions: Extracted width/height:', { width, height });

        const result = {`
    ).replace(
        '      screenWidth: width,\n      screenHeight: height,\n      isLandscape: width > height,\n      aspectRatio: width / height,\n    };',
        `          screenWidth: width,
          screenHeight: height,
          isLandscape: width > height,
          aspectRatio: width / height,
        };
        console.log('[DEBUG_LOG] useJSISafeDimensions: Created dimensions object:', result);
        return result;
      } catch (error) {
        console.error('[DEBUG_LOG] useJSISafeDimensions: ERROR in dimensions:', error);
        throw error;
      }`
    ).replace(
        '  }, [rawDimensions.width, rawDimensions.height]);',
        `    }, [rawDimensions.width, rawDimensions.height]);
    console.log('[DEBUG_LOG] useJSISafeDimensions: dimensions created successfully');`
    ).replace(
        '  return {\n    dimensions,\n    breakpoints,\n    safeAreas,\n    animationValues,\n  };',
        `    const result = {
      dimensions,
      breakpoints,
      safeAreas,
      animationValues,
    };
    console.log('[DEBUG_LOG] useJSISafeDimensions: Returning final result:', result);
    return result;
  } catch (error) {
    console.error('[DEBUG_LOG] useJSISafeDimensions: FATAL ERROR in hook:', error);
    console.error('[DEBUG_LOG] useJSISafeDimensions: Error stack:', error.stack);
    throw error;
  }`
    );

    // Write debug version
    fs.writeFileSync(hookPath, debugContent, 'utf8');
    console.log('[DEBUG_LOG] ✅ Debug logs added to useJSISafeDimensions hook');

    console.log('[DEBUG_LOG] === DEBUG SETUP COMPLETE ===');
    console.log('[DEBUG_LOG] Now run the app to see detailed execution logs');
    console.log('[DEBUG_LOG] The logs will show exactly where the ReferenceError occurs');

} catch (error) {
    console.error('[DEBUG_LOG] ❌ Error setting up debug logs:', error.message);
}
