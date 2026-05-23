#!/usr/bin/env node

/**
 * JSI Safety Worklet Validator
 * Analyzes React Native Reanimated 3 worklets for JSI violations
 * Prevents JSI assertion failures by detecting unsafe patterns
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// JSI violation patterns to detect
const JSI_VIOLATIONS = {
    DIMENSIONS_GET: /Dimensions\.get\s*\(/g,
    DATE_NOW: /Date\.now\s*\(/g,
    MATH_RANDOM: /Math\.random\s*\(/g,
    CONSOLE_METHODS: /console\.(log|warn|error|info|debug)\s*\(/g,
    SET_TIMEOUT: /setTimeout\s*\(/g,
    SET_INTERVAL: /setInterval\s*\(/g,
    WINDOW_GLOBAL: /\bwindow\./g,
    DOCUMENT_GLOBAL: /\bdocument\./g
};

// Worklet context patterns
const WORKLET_CONTEXTS = {
    USE_ANIMATED_STYLE: /useAnimatedStyle\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*\)/g,
    USE_ANIMATED_SCROLL_HANDLER: /useAnimatedScrollHandler\s*\(\s*\{[\s\S]*?\}\s*\)/g,
    WORKLET_FUNCTION: /'worklet'|"worklet"/g
};

class WorkletValidator {
    constructor() {
        this.violations = [];
        this.filesChecked = 0;
        this.violationsFound = 0;
    }

    /**
     * Validate all TypeScript/TSX files in the project
     */
    async validateProject() {
        console.log('🔍 Starting JSI Safety Worklet Validation...\n');

        const files = glob.sync('src/**/*.{ts,tsx}', {
            ignore: ['node_modules/**', '__tests__/**', '**/*.test.{ts,tsx}']
        });

        for (const file of files) {
            await this.validateFile(file);
        }

        this.printResults();
        return this.violations.length === 0;
    }

    /**
     * Validate a single file for JSI violations
     */
    async validateFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            this.filesChecked++;

            // Check if file contains worklets
            const hasWorklets = this.hasWorkletContext(content);
            if (!hasWorklets) {
                return;
            }

            console.log(`📄 Checking worklets in: ${filePath}`);

            // Extract worklet code blocks
            const workletBlocks = this.extractWorkletBlocks(content);

            // Check each worklet block for violations
            workletBlocks.forEach((block, index) => {
                this.checkWorkletBlock(filePath, block, index);
            });

        } catch (error) {
            console.error(`❌ Error reading file ${filePath}:`, error.message);
        }
    }

    /**
     * Check if file contains worklet contexts
     */
    hasWorkletContext(content) {
        return Object.values(WORKLET_CONTEXTS).some(pattern => pattern.test(content));
    }

    /**
     * Extract worklet code blocks from file content
     */
    extractWorkletBlocks(content) {
        const blocks = [];

        // Extract useAnimatedStyle blocks
        const animatedStyleMatches = content.matchAll(WORKLET_CONTEXTS.USE_ANIMATED_STYLE);
        for (const match of animatedStyleMatches) {
            blocks.push({
                type: 'useAnimatedStyle',
                code: match[0],
                startIndex: match.index
            });
        }

        // Extract useAnimatedScrollHandler blocks
        const scrollHandlerMatches = content.matchAll(WORKLET_CONTEXTS.USE_ANIMATED_SCROLL_HANDLER);
        for (const match of scrollHandlerMatches) {
            blocks.push({
                type: 'useAnimatedScrollHandler',
                code: match[0],
                startIndex: match.index
            });
        }

        return blocks;
    }

    /**
     * Check a worklet block for JSI violations
     */
    checkWorkletBlock(filePath, block, blockIndex) {
        Object.entries(JSI_VIOLATIONS).forEach(([violationType, pattern]) => {
            const matches = block.code.matchAll(pattern);
            for (const match of matches) {
                this.addViolation(filePath, block, violationType, match[0], blockIndex);
            }
        });
    }

    /**
     * Add a JSI violation to the results
     */
    addViolation(filePath, block, violationType, violationCode, blockIndex) {
        this.violationsFound++;

        const violation = {
            file: filePath,
            workletType: block.type,
            blockIndex,
            violationType,
            violationCode: violationCode.trim(),
            severity: this.getViolationSeverity(violationType),
            message: this.getViolationMessage(violationType),
            suggestion: this.getViolationSuggestion(violationType)
        };

        this.violations.push(violation);

        // Print violation immediately
        console.log(`🚨 ${violation.severity} JSI VIOLATION DETECTED:`);
        console.log(`   File: ${filePath}`);
        console.log(`   Worklet: ${block.type} (block ${blockIndex})`);
        console.log(`   Issue: ${violationCode}`);
        console.log(`   Problem: ${violation.message}`);
        console.log(`   Solution: ${violation.suggestion}\n`);
    }

    /**
     * Get violation severity level
     */
    getViolationSeverity(violationType) {
        const criticalViolations = ['DIMENSIONS_GET', 'DATE_NOW', 'MATH_RANDOM'];
        return criticalViolations.includes(violationType) ? 'CRITICAL' : 'WARNING';
    }

    /**
     * Get human-readable violation message
     */
    getViolationMessage(violationType) {
        const messages = {
            DIMENSIONS_GET: 'Dimensions.get() called inside worklet - will cause JSI assertion failure',
            DATE_NOW: 'Date.now() called inside worklet - JavaScript API not available on UI thread',
            MATH_RANDOM: 'Math.random() called inside worklet - JavaScript API not available on UI thread',
            CONSOLE_METHODS: 'Console methods called inside worklet - use runOnJS() wrapper',
            SET_TIMEOUT: 'setTimeout called inside worklet - use runOnJS() wrapper',
            SET_INTERVAL: 'setInterval called inside worklet - use runOnJS() wrapper',
            WINDOW_GLOBAL: 'Window global accessed inside worklet - not available on UI thread',
            DOCUMENT_GLOBAL: 'Document global accessed inside worklet - not available on UI thread'
        };
        return messages[violationType] || 'Unknown JSI violation';
    }

    /**
     * Get violation fix suggestion
     */
    getViolationSuggestion(violationType) {
        const suggestions = {
            DIMENSIONS_GET: 'Cache with useMemo: const screenWidth = useMemo(() => Dimensions.get("window").width, [])',
            DATE_NOW: 'Use useSharedValue: const timestamp = useSharedValue(Date.now())',
            MATH_RANDOM: 'Use useSharedValue: const randomValue = useSharedValue(Math.random())',
            CONSOLE_METHODS: 'Wrap with runOnJS: runOnJS(() => console.log("debug"))()',
            SET_TIMEOUT: 'Wrap with runOnJS: runOnJS(() => setTimeout(callback, delay))()',
            SET_INTERVAL: 'Wrap with runOnJS: runOnJS(() => setInterval(callback, delay))()',
            WINDOW_GLOBAL: 'Wrap with runOnJS or avoid accessing window in worklets',
            DOCUMENT_GLOBAL: 'Wrap with runOnJS or avoid accessing document in worklets'
        };
        return suggestions[violationType] || 'Wrap with runOnJS() or cache outside worklet';
    }

    /**
     * Print validation results
     */
    printResults() {
        console.log('='.repeat(60));
        console.log('📊 JSI SAFETY WORKLET VALIDATION RESULTS');
        console.log('='.repeat(60));
        console.log(`📁 Files checked: ${this.filesChecked}`);
        console.log(`🚨 Violations found: ${this.violationsFound}`);
        console.log(`📋 Critical violations: ${this.violations.filter(v => v.severity === 'CRITICAL').length}`);
        console.log(`⚠️  Warning violations: ${this.violations.filter(v => v.severity === 'WARNING').length}`);

        if (this.violations.length === 0) {
            console.log('\n✅ SUCCESS: No JSI violations detected in worklets!');
            console.log('🎉 All worklets are JSI-safe and should not cause assertion failures.');
        } else {
            console.log('\n❌ FAILURE: JSI violations detected!');
            console.log('🔧 Please fix the violations above to prevent JSI assertion failures.');

            // Group violations by file
            const violationsByFile = this.violations.reduce((acc, violation) => {
                if (!acc[violation.file]) acc[violation.file] = [];
                acc[violation.file].push(violation);
                return acc;
            }, {});

            console.log('\n📋 SUMMARY BY FILE:');
            Object.entries(violationsByFile).forEach(([file, violations]) => {
                console.log(`   ${file}: ${violations.length} violation(s)`);
            });
        }

        console.log('='.repeat(60));
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new WorkletValidator();
    validator.validateProject().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    });
}

module.exports = WorkletValidator;
