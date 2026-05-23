#!/usr/bin/env node

/**
 * JSI Safety Analyzer
 * Deep analysis tool for React Native Reanimated 3 components
 * Provides detailed JSI safety assessment and recommendations
 */

const fs = require('fs');
const path = require('path');

class JSISafetyAnalyzer {
    constructor() {
        this.analysisResults = [];
        this.recommendations = [];
    }

    /**
     * Analyze files passed as command line arguments
     */
    async analyzeFiles(filePaths) {
        console.log('🔬 Starting Deep JSI Safety Analysis...\n');

        for (const filePath of filePaths) {
            if (fs.existsSync(filePath)) {
                await this.analyzeFile(filePath);
            }
        }

        this.generateReport();
        return this.analysisResults.every(result => result.isSafe);
    }

    /**
     * Analyze a single file for JSI safety
     */
    async analyzeFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const analysis = {
                file: filePath,
                isSafe: true,
                riskLevel: 'LOW',
                issues: [],
                patterns: this.analyzePatterns(content),
                recommendations: []
            };

            console.log(`🔍 Analyzing: ${filePath}`);

            // Analyze different aspects
            this.analyzeImports(content, analysis);
            this.analyzeWorkletUsage(content, analysis);
            this.analyzeDimensionsUsage(content, analysis);
            this.analyzeAnimationPatterns(content, analysis);
            this.analyzeMemoryManagement(content, analysis);

            // Calculate overall risk level
            this.calculateRiskLevel(analysis);

            // Generate recommendations
            this.generateRecommendations(analysis);

            this.analysisResults.push(analysis);

        } catch (error) {
            console.error(`❌ Error analyzing ${filePath}:`, error.message);
        }
    }

    /**
     * Analyze import patterns
     */
    analyzeImports(content, analysis) {
        const reanimatedImports = content.match(/import.*from\s+['"]react-native-reanimated['"];?/g);
        const dimensionsImports = content.match(/import.*Dimensions.*from\s+['"]react-native['"];?/g);

        if (reanimatedImports) {
            analysis.patterns.hasReanimatedImports = true;

            // Check for specific Reanimated imports
            if (content.includes('useAnimatedStyle')) {
                analysis.patterns.usesAnimatedStyle = true;
            }
            if (content.includes('useAnimatedScrollHandler')) {
                analysis.patterns.usesAnimatedScrollHandler = true;
            }
            if (content.includes('runOnJS')) {
                analysis.patterns.usesRunOnJS = true;
            }
        }

        if (dimensionsImports) {
            analysis.patterns.importsDimensions = true;
        }
    }

    /**
     * Analyze worklet usage patterns
     */
    analyzeWorkletUsage(content, analysis) {
        // Check for worklet functions
        const workletFunctions = content.match(/'worklet'|"worklet"/g);
        if (workletFunctions) {
            analysis.patterns.hasWorkletFunctions = workletFunctions.length;
        }

        // Check for useAnimatedStyle usage
        const animatedStyleMatches = content.match(/useAnimatedStyle\s*\(/g);
        if (animatedStyleMatches) {
            analysis.patterns.animatedStyleCount = animatedStyleMatches.length;

            // Check for potential JSI violations in useAnimatedStyle
            const animatedStyleBlocks = this.extractAnimatedStyleBlocks(content);
            animatedStyleBlocks.forEach((block, index) => {
                this.checkBlockForViolations(block, `useAnimatedStyle-${index}`, analysis);
            });
        }

        // Check for useAnimatedScrollHandler usage
        const scrollHandlerMatches = content.match(/useAnimatedScrollHandler\s*\(/g);
        if (scrollHandlerMatches) {
            analysis.patterns.scrollHandlerCount = scrollHandlerMatches.length;

            // Check for potential JSI violations in scroll handlers
            const scrollHandlerBlocks = this.extractScrollHandlerBlocks(content);
            scrollHandlerBlocks.forEach((block, index) => {
                this.checkBlockForViolations(block, `useAnimatedScrollHandler-${index}`, analysis);
            });
        }
    }

    /**
     * Analyze Dimensions usage patterns
     */
    analyzeDimensionsUsage(content, analysis) {
        const dimensionsGetCalls = content.match(/Dimensions\.get\s*\(/g);
        if (dimensionsGetCalls) {
            analysis.patterns.dimensionsGetCount = dimensionsGetCalls.length;

            // Check if Dimensions.get is used safely with useMemo
            const useMemoWithDimensions = content.match(/useMemo\s*\(\s*\(\s*\)\s*=>\s*Dimensions\.get/g);
            if (useMemoWithDimensions) {
                analysis.patterns.safelyUsedDimensions = useMemoWithDimensions.length;
                analysis.recommendations.push({
                    type: 'GOOD_PRACTICE',
                    message: 'Good: Dimensions.get() is cached with useMemo',
                    priority: 'LOW'
                });
            } else {
                analysis.issues.push({
                    type: 'POTENTIAL_JSI_VIOLATION',
                    severity: 'HIGH',
                    message: 'Dimensions.get() found but not cached with useMemo',
                    suggestion: 'Cache Dimensions.get() calls with useMemo to prevent JSI violations'
                });
                analysis.isSafe = false;
            }
        }
    }

    /**
     * Analyze animation patterns
     */
    analyzeAnimationPatterns(content, analysis) {
        // Check for interpolate usage
        if (content.includes('interpolate')) {
            analysis.patterns.usesInterpolate = true;
        }

        // Check for withTiming usage
        if (content.includes('withTiming')) {
            analysis.patterns.usesWithTiming = true;
        }

        // Check for withSpring usage
        if (content.includes('withSpring')) {
            analysis.patterns.usesWithSpring = true;
        }

        // Check for withRepeat usage
        if (content.includes('withRepeat')) {
            analysis.patterns.usesWithRepeat = true;
        }

        // Check for shared values
        const sharedValueMatches = content.match(/useSharedValue\s*\(/g);
        if (sharedValueMatches) {
            analysis.patterns.sharedValueCount = sharedValueMatches.length;
        }
    }

    /**
     * Analyze memory management patterns
     */
    analyzeMemoryManagement(content, analysis) {
        // Check for useEffect cleanup
        if (content.includes('return () => {') || content.includes('return function')) {
            analysis.patterns.hasCleanup = true;
            analysis.recommendations.push({
                type: 'GOOD_PRACTICE',
                message: 'Good: Component has cleanup logic',
                priority: 'LOW'
            });
        }

        // Check for AbortController usage
        if (content.includes('AbortController')) {
            analysis.patterns.usesAbortController = true;
            analysis.recommendations.push({
                type: 'GOOD_PRACTICE',
                message: 'Good: Uses AbortController for cleanup',
                priority: 'LOW'
            });
        }

        // Check for isMounted pattern
        if (content.includes('isMounted')) {
            analysis.patterns.usesIsMountedPattern = true;
            analysis.recommendations.push({
                type: 'GOOD_PRACTICE',
                message: 'Good: Uses isMounted pattern to prevent memory leaks',
                priority: 'LOW'
            });
        }
    }

    /**
     * Extract useAnimatedStyle blocks
     */
    extractAnimatedStyleBlocks(content) {
        const blocks = [];
        const regex = /useAnimatedStyle\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*\)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            blocks.push(match[0]);
        }
        return blocks;
    }

    /**
     * Extract useAnimatedScrollHandler blocks
     */
    extractScrollHandlerBlocks(content) {
        const blocks = [];
        const regex = /useAnimatedScrollHandler\s*\(\s*\{[\s\S]*?\}\s*\)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            blocks.push(match[0]);
        }
        return blocks;
    }

    /**
     * Check a code block for JSI violations
     */
    checkBlockForViolations(block, blockName, analysis) {
        const violations = [
            {pattern: /Dimensions\.get\s*\(/g, type: 'DIMENSIONS_GET', severity: 'CRITICAL'},
            {pattern: /Date\.now\s*\(/g, type: 'DATE_NOW', severity: 'CRITICAL'},
            {pattern: /Math\.random\s*\(/g, type: 'MATH_RANDOM', severity: 'CRITICAL'},
            {pattern: /console\.(log|warn|error|info)\s*\(/g, type: 'CONSOLE_METHODS', severity: 'WARNING'},
            {pattern: /setTimeout\s*\(/g, type: 'SET_TIMEOUT', severity: 'WARNING'},
            {pattern: /setInterval\s*\(/g, type: 'SET_INTERVAL', severity: 'WARNING'}
        ];

        violations.forEach(({pattern, type, severity}) => {
            const matches = block.match(pattern);
            if (matches) {
                analysis.issues.push({
                    type: 'JSI_VIOLATION',
                    severity,
                    violationType: type,
                    blockName,
                    message: `${type} detected in ${blockName}`,
                    suggestion: this.getViolationSuggestion(type)
                });
                analysis.isSafe = false;
            }
        });
    }

    /**
     * Get suggestion for violation type
     */
    getViolationSuggestion(violationType) {
        const suggestions = {
            DIMENSIONS_GET: 'Cache with useMemo: const screenWidth = useMemo(() => Dimensions.get("window").width, [])',
            DATE_NOW: 'Use useSharedValue: const timestamp = useSharedValue(Date.now())',
            MATH_RANDOM: 'Use useSharedValue: const randomValue = useSharedValue(Math.random())',
            CONSOLE_METHODS: 'Wrap with runOnJS: runOnJS(() => console.log("debug"))()',
            SET_TIMEOUT: 'Wrap with runOnJS: runOnJS(() => setTimeout(callback, delay))()',
            SET_INTERVAL: 'Wrap with runOnJS: runOnJS(() => setInterval(callback, delay))()'
        };
        return suggestions[violationType] || 'Wrap with runOnJS() or cache outside worklet';
    }

    /**
     * Calculate overall risk level
     */
    calculateRiskLevel(analysis) {
        const criticalIssues = analysis.issues.filter(issue => issue.severity === 'CRITICAL').length;
        const warningIssues = analysis.issues.filter(issue => issue.severity === 'WARNING').length;

        if (criticalIssues > 0) {
            analysis.riskLevel = 'CRITICAL';
        } else if (warningIssues > 2) {
            analysis.riskLevel = 'HIGH';
        } else if (warningIssues > 0) {
            analysis.riskLevel = 'MEDIUM';
        } else {
            analysis.riskLevel = 'LOW';
        }
    }

    /**
     * Generate recommendations for the analysis
     */
    generateRecommendations(analysis) {
        // Recommend useMemo for Dimensions if not used
        if (analysis.patterns.importsDimensions && !analysis.patterns.safelyUsedDimensions) {
            analysis.recommendations.push({
                type: 'IMPROVEMENT',
                message: 'Consider caching Dimensions.get() calls with useMemo',
                priority: 'HIGH'
            });
        }

        // Recommend runOnJS if not used but has worklets
        if (analysis.patterns.hasWorkletFunctions && !analysis.patterns.usesRunOnJS) {
            analysis.recommendations.push({
                type: 'IMPROVEMENT',
                message: 'Consider using runOnJS() for JavaScript function calls in worklets',
                priority: 'MEDIUM'
            });
        }

        // Recommend cleanup if not present
        if ((analysis.patterns.animatedStyleCount > 0 || analysis.patterns.scrollHandlerCount > 0) && !analysis.patterns.hasCleanup) {
            analysis.recommendations.push({
                type: 'IMPROVEMENT',
                message: 'Consider adding cleanup logic in useEffect',
                priority: 'MEDIUM'
            });
        }
    }

    /**
     * Initialize analysis patterns object
     */
    analyzePatterns(content) {
        return {
            hasReanimatedImports: false,
            importsDimensions: false,
            usesAnimatedStyle: false,
            usesAnimatedScrollHandler: false,
            usesRunOnJS: false,
            hasWorkletFunctions: 0,
            animatedStyleCount: 0,
            scrollHandlerCount: 0,
            dimensionsGetCount: 0,
            safelyUsedDimensions: 0,
            usesInterpolate: false,
            usesWithTiming: false,
            usesWithSpring: false,
            usesWithRepeat: false,
            sharedValueCount: 0,
            hasCleanup: false,
            usesAbortController: false,
            usesIsMountedPattern: false
        };
    }

    /**
     * Generate comprehensive analysis report
     */
    generateReport() {
        console.log('\n' + '='.repeat(70));
        console.log('📊 JSI SAFETY ANALYSIS REPORT');
        console.log('='.repeat(70));

        this.analysisResults.forEach(result => {
            console.log(`\n📄 File: ${result.file}`);
            console.log(`🎯 Risk Level: ${this.getRiskLevelEmoji(result.riskLevel)} ${result.riskLevel}`);
            console.log(`✅ JSI Safe: ${result.isSafe ? '✅ YES' : '❌ NO'}`);

            if (result.issues.length > 0) {
                console.log(`\n🚨 Issues Found (${result.issues.length}):`);
                result.issues.forEach((issue, index) => {
                    console.log(`   ${index + 1}. [${issue.severity}] ${issue.message}`);
                    if (issue.suggestion) {
                        console.log(`      💡 ${issue.suggestion}`);
                    }
                });
            }

            if (result.recommendations.length > 0) {
                console.log(`\n💡 Recommendations (${result.recommendations.length}):`);
                result.recommendations.forEach((rec, index) => {
                    console.log(`   ${index + 1}. [${rec.priority}] ${rec.message}`);
                });
            }

            // Pattern summary
            console.log(`\n📋 Pattern Summary:`);
            console.log(`   • Animated Styles: ${result.patterns.animatedStyleCount}`);
            console.log(`   • Scroll Handlers: ${result.patterns.scrollHandlerCount}`);
            console.log(`   • Shared Values: ${result.patterns.sharedValueCount}`);
            console.log(`   • Dimensions Calls: ${result.patterns.dimensionsGetCount}`);
            console.log(`   • Safe Dimensions: ${result.patterns.safelyUsedDimensions}`);
            console.log(`   • Uses runOnJS: ${result.patterns.usesRunOnJS ? '✅' : '❌'}`);
            console.log(`   • Has Cleanup: ${result.patterns.hasCleanup ? '✅' : '❌'}`);
        });

        // Overall summary
        const totalFiles = this.analysisResults.length;
        const safeFiles = this.analysisResults.filter(r => r.isSafe).length;
        const criticalFiles = this.analysisResults.filter(r => r.riskLevel === 'CRITICAL').length;

        console.log('\n' + '='.repeat(70));
        console.log('📈 OVERALL SUMMARY');
        console.log('='.repeat(70));
        console.log(`📁 Total Files Analyzed: ${totalFiles}`);
        console.log(`✅ JSI Safe Files: ${safeFiles}/${totalFiles}`);
        console.log(`🚨 Critical Risk Files: ${criticalFiles}`);
        console.log(`📊 Safety Rate: ${Math.round((safeFiles / totalFiles) * 100)}%`);

        if (safeFiles === totalFiles) {
            console.log('\n🎉 EXCELLENT: All analyzed files are JSI-safe!');
        } else {
            console.log('\n⚠️  WARNING: Some files have JSI safety issues that need attention.');
        }

        console.log('='.repeat(70));
    }

    /**
     * Get emoji for risk level
     */
    getRiskLevelEmoji(riskLevel) {
        const emojis = {
            LOW: '🟢',
            MEDIUM: '🟡',
            HIGH: '🟠',
            CRITICAL: '🔴'
        };
        return emojis[riskLevel] || '⚪';
    }
}

// Run analyzer if called directly
if (require.main === module) {
    const filePaths = process.argv.slice(2);
    if (filePaths.length === 0) {
        console.error('❌ Usage: node jsi-safety-analyzer.js <file1> <file2> ...');
        process.exit(1);
    }

    const analyzer = new JSISafetyAnalyzer();
    analyzer.analyzeFiles(filePaths).then(allSafe => {
        process.exit(allSafe ? 0 : 1);
    }).catch(error => {
        console.error('❌ Analysis failed:', error);
        process.exit(1);
    });
}

module.exports = JSISafetyAnalyzer;
