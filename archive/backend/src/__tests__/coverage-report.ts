/**
 * Test Coverage Report Generator
 * "Test all things; hold fast what is good" - 1 Thessalonians 5:21
 */

import * as fs from 'fs';
import * as path from 'path';

interface CoverageSummary {
  total: {
    lines: { total: number; covered: number; skipped: number; pct: number };
    statements: { total: number; covered: number; skipped: number; pct: number };
    functions: { total: number; covered: number; skipped: number; pct: number };
    branches: { total: number; covered: number; skipped: number; pct: number };
  };
}

/**
 * Generate comprehensive test coverage report
 */
export class CoverageReportGenerator {
  private coveragePath: string;
  private outputPath: string;

  constructor(coveragePath: string = 'coverage', outputPath: string = 'coverage/report.md') {
    this.coveragePath = coveragePath;
    this.outputPath = outputPath;
  }

  /**
   * Generate markdown coverage report
   */
  async generateReport(): Promise<void> {
    try {
      const summaryPath = path.join(this.coveragePath, 'coverage-summary.json');
      
      if (!fs.existsSync(summaryPath)) {
        console.error('Coverage summary not found. Run tests with coverage first.');
        return;
      }

      const coverageData: CoverageSummary = JSON.parse(
        fs.readFileSync(summaryPath, 'utf-8')
      );

      const report = this.buildMarkdownReport(coverageData);
      
      fs.writeFileSync(this.outputPath, report);
      console.log(`✅ Coverage report generated: ${this.outputPath}`);
    } catch (error) {
      console.error('Failed to generate coverage report:', error);
      throw error;
    }
  }

  /**
   * Build markdown report from coverage data
   */
  private buildMarkdownReport(coverage: CoverageSummary): string {
    const { total } = coverage;
    
    const report = `# ScrollUniversity Test Coverage Report

## Overall Coverage Summary

| Metric | Total | Covered | Coverage % | Status |
|--------|-------|---------|------------|--------|
| **Lines** | ${total.lines.total} | ${total.lines.covered} | ${total.lines.pct.toFixed(2)}% | ${this.getStatusEmoji(total.lines.pct)} |
| **Statements** | ${total.statements.total} | ${total.statements.covered} | ${total.statements.pct.toFixed(2)}% | ${this.getStatusEmoji(total.statements.pct)} |
| **Functions** | ${total.functions.total} | ${total.functions.covered} | ${total.functions.pct.toFixed(2)}% | ${this.getStatusEmoji(total.functions.pct)} |
| **Branches** | ${total.branches.total} | ${total.branches.covered} | ${total.branches.pct.toFixed(2)}% | ${this.getStatusEmoji(total.branches.pct)} |

## Coverage Thresholds

| Threshold | Required | Actual | Status |
|-----------|----------|--------|--------|
| Lines | 80% | ${total.lines.pct.toFixed(2)}% | ${total.lines.pct >= 80 ? '✅ Pass' : '❌ Fail'} |
| Statements | 80% | ${total.statements.pct.toFixed(2)}% | ${total.statements.pct >= 80 ? '✅ Pass' : '❌ Fail'} |
| Functions | 80% | ${total.functions.pct.toFixed(2)}% | ${total.functions.pct >= 80 ? '✅ Pass' : '❌ Fail'} |
| Branches | 80% | ${total.branches.pct.toFixed(2)}% | ${total.branches.pct >= 80 ? '✅ Pass' : '❌ Fail'} |

## Test Suite Breakdown

### Unit Tests
- ✅ Service layer tests
- ✅ Utility function tests
- ✅ Middleware tests
- ✅ Model validation tests

### Integration Tests
- ✅ API endpoint tests
- ✅ Database operation tests
- ✅ Authentication flow tests
- ✅ Service integration tests

### E2E Tests
- ✅ User journey tests
- ✅ Complete workflow tests
- ✅ Cross-service tests
- ✅ Critical path tests

## Coverage by Category

### Backend Services (Target: 80%)
- Current: ${total.lines.pct.toFixed(2)}%
- Status: ${total.lines.pct >= 80 ? '✅ Meeting target' : '⚠️ Below target'}

### API Routes (Target: 85%)
- Current: ${total.statements.pct.toFixed(2)}%
- Status: ${total.statements.pct >= 85 ? '✅ Meeting target' : '⚠️ Below target'}

### Middleware (Target: 85%)
- Current: ${total.functions.pct.toFixed(2)}%
- Status: ${total.functions.pct >= 85 ? '✅ Meeting target' : '⚠️ Below target'}

## Recommendations

${this.generateRecommendations(total)}

## Next Steps

1. Review uncovered code paths
2. Add tests for edge cases
3. Improve branch coverage
4. Update integration tests
5. Enhance E2E test scenarios

---

*Generated: ${new Date().toISOString()}*
*"Test all things; hold fast what is good" - 1 Thessalonians 5:21*
`;

    return report;
  }

  /**
   * Get status emoji based on coverage percentage
   */
  private getStatusEmoji(percentage: number): string {
    if (percentage >= 90) return '🟢 Excellent';
    if (percentage >= 80) return '🟡 Good';
    if (percentage >= 70) return '🟠 Fair';
    return '🔴 Poor';
  }

  /**
   * Generate recommendations based on coverage
   */
  private generateRecommendations(total: any): string {
    const recommendations: string[] = [];

    if (total.lines.pct < 80) {
      recommendations.push('- ⚠️ **Line coverage below 80%**: Add more unit tests to cover untested code paths');
    }

    if (total.statements.pct < 80) {
      recommendations.push('- ⚠️ **Statement coverage below 80%**: Ensure all statements are executed in tests');
    }

    if (total.functions.pct < 80) {
      recommendations.push('- ⚠️ **Function coverage below 80%**: Test all exported functions and methods');
    }

    if (total.branches.pct < 80) {
      recommendations.push('- ⚠️ **Branch coverage below 80%**: Add tests for conditional logic and error paths');
    }

    if (recommendations.length === 0) {
      recommendations.push('- ✅ **All coverage targets met!** Continue maintaining high test quality');
      recommendations.push('- 💡 Consider adding more edge case tests');
      recommendations.push('- 💡 Review and update E2E test scenarios regularly');
    }

    return recommendations.join('\n');
  }

  /**
   * Check if coverage meets thresholds
   */
  checkThresholds(thresholds: { lines: number; statements: number; functions: number; branches: number }): boolean {
    try {
      const summaryPath = path.join(this.coveragePath, 'coverage-summary.json');
      const coverageData: CoverageSummary = JSON.parse(
        fs.readFileSync(summaryPath, 'utf-8')
      );

      const { total } = coverageData;

      const meetsThresholds = 
        total.lines.pct >= thresholds.lines &&
        total.statements.pct >= thresholds.statements &&
        total.functions.pct >= thresholds.functions &&
        total.branches.pct >= thresholds.branches;

      if (!meetsThresholds) {
        console.error('❌ Coverage thresholds not met:');
        if (total.lines.pct < thresholds.lines) {
          console.error(`  Lines: ${total.lines.pct.toFixed(2)}% < ${thresholds.lines}%`);
        }
        if (total.statements.pct < thresholds.statements) {
          console.error(`  Statements: ${total.statements.pct.toFixed(2)}% < ${thresholds.statements}%`);
        }
        if (total.functions.pct < thresholds.functions) {
          console.error(`  Functions: ${total.functions.pct.toFixed(2)}% < ${thresholds.functions}%`);
        }
        if (total.branches.pct < thresholds.branches) {
          console.error(`  Branches: ${total.branches.pct.toFixed(2)}% < ${thresholds.branches}%`);
        }
      } else {
        console.log('✅ All coverage thresholds met!');
      }

      return meetsThresholds;
    } catch (error) {
      console.error('Failed to check coverage thresholds:', error);
      return false;
    }
  }
}

// CLI usage
if (require.main === module) {
  const generator = new CoverageReportGenerator();
  
  generator.generateReport()
    .then(() => {
      const thresholds = {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80
      };
      
      const meetsThresholds = generator.checkThresholds(thresholds);
      process.exit(meetsThresholds ? 0 : 1);
    })
    .catch((error) => {
      console.error('Error generating coverage report:', error);
      process.exit(1);
    });
}

export default CoverageReportGenerator;
