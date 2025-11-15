# 🧪 File Manager - Test Suite

**Version**: 1.0  
**Last Updated**: 15 January 2025  
**Status**: Active

---

## 📋 Overview

This directory contains automated and manual testing resources for the File Manager modular application.

### Test Files

1. **[integration-test.html](./integration-test.html)** - Automated Integration Test Suite
   - Visual test runner with real-time progress
   - 20+ automated test cases
   - Cross-browser compatibility testing
   - Export test results to JSON

2. **[performance-benchmark.html](./performance-benchmark.html)** - Performance Benchmark Suite
   - 7 comprehensive performance tests
   - Real-time metrics dashboard
   - Before/after comparison tables
   - Performance scoring (0-100)
   - Export benchmark results
   - See [Performance Benchmark Guide](./PERFORMANCE_BENCHMARK_GUIDE.md)

---

## 🚀 Quick Start

### Running Automated Tests

#### Integration Tests

1. **Open Test Runner**
   ```
   Navigate to: http://localhost/Filemanager/test/integration-test.html
   ```

2. **Run Tests**
   - Click "▶️ Run All Tests" to run complete suite
   - Click "🎯 Run Critical Only" for critical path tests
   - Click "⏸️ Pause" to pause execution
   - Click "⏹️ Stop" to stop tests
   - Click "🔄 Reset" to reset all tests
   - Click "📊 Export Results" to download JSON report

3. **Monitor Progress**
   - Watch real-time progress bar
   - View summary cards (Total, Passed, Failed, Pending)
   - Check detailed results for each test
   - Review log output at bottom

#### Performance Benchmarks

1. **Open Benchmark Suite**
   ```
   Navigate to: http://localhost/Filemanager/test/performance-benchmark.html
   ```

2. **Run Benchmarks**
   - Click "⚡ Quick Test" for rapid validation (3 tests, ~2s)
   - Click "🚀 Run All Tests" for comprehensive testing (7 tests, ~5s)
   - View real-time metrics updates
   - Check before/after comparison table

3. **Review Results**
   - Overall performance score (target: >90/100)
   - Bundle size (target: <125KB)
   - Time to Interactive (target: <1500ms)
   - Memory usage (target: <50MB)
   - Detailed test log with timestamps

---

## 📊 Test Suites

### 1. Navigation Tests (Critical)
- Initial page load performance
- Folder navigation functionality
- Breadcrumb navigation

### 2. File Operations (Critical)
- Upload file
- Create folder
- Create file
- Rename file
- Delete file

### 3. Preview Features (High)
- Text file preview with line numbers
- Image preview
- PDF preview
- Close preview button

### 4. State Persistence (Critical)
- Sort preferences persistence
- Last path persistence
- Graceful degradation without localStorage

### 5. Performance Benchmarks (Critical)
- Bundle size analysis (<125KB target)
- Time to Interactive (<1500ms target)
- Memory usage monitoring (<50MB target)
- Code splitting performance
- Icon rendering speed (<50ms for 100 items)
- Sort operations (<80ms for 500 items)
- Scroll performance (>50 FPS with virtual scroll)

---

## 🎯 Success Criteria

### Integration Test Pass Thresholds
```
Critical Tests: 100% pass required
High Priority:  95%+ pass required
Medium Priority: 90%+ pass required
Overall:        95%+ pass required
```

### Performance Benchmark Targets
```
Overall Score:  > 90/100 (Excellent)
Bundle Size:    < 125KB (baseline: 156KB, -22% improvement)
TTI:            < 1500ms (baseline: 2100ms, -33% improvement)
Memory:         < 50MB (baseline: 52MB, -8% improvement)
Icon Render:    < 50ms for 100 items (baseline: 200ms, +80% faster)
Sort Ops:       < 80ms for 500 items (baseline: 180ms, +61% faster)
Scroll FPS:     > 50 FPS (baseline: 30-35 FPS, +60% improvement)
```

---

## 📝 Manual Testing

For comprehensive manual testing procedures, see:
- **[Integration Testing Guide](../docs/INTEGRATION_TESTING_GUIDE.md)** - Complete testing procedures
- **[Drag Drop Testing Guide](../docs/DRAG_DROP_TESTING.md)** - Drag & drop specific tests

---

## 🐛 Bug Reporting

### Found a Bug?

1. **Document the Issue**
   - Test ID that failed
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and OS details
   - Screenshots if applicable

2. **Report It**
   - Use bug template from Integration Testing Guide
   - Include all relevant details
   - Assign severity (Critical, High, Medium, Low)
   - Tag with affected module

---

## 🔧 Test Configuration

### Customizing Tests

Edit `integration-test.html` to modify:

```javascript
const testConfig = {
    baseUrl: 'http://localhost/Filemanager',
    timeout: 5000,
    retryCount: 2,
    delayBetweenTests: 500
};
```

### Adding New Tests

Add new test cases to the `testSuites` array:

```javascript
{
    id: 'new-feature',
    name: 'New Feature Tests',
    priority: 'high',
    tests: [
        {
            id: 'new-001',
            name: 'Test Name',
            description: 'Test description',
            test: async () => {
                // Test implementation
                await delay(300);
                return { 
                    passed: true, 
                    message: 'Test passed' 
                };
            }
        }
    ]
}
```

---

## 📈 Test Results

### Viewing Results

Results are displayed in:
1. **Real-time UI** - Visual feedback during test execution
2. **Summary Cards** - Quick overview of pass/fail counts
3. **Detailed Logs** - Console-style output with timestamps
4. **JSON Export** - Downloadable report for analysis

### Sample JSON Export

```json
{
    "timestamp": "2025-01-15T13:45:00.000Z",
    "summary": {
        "total": 20,
        "passed": 18,
        "failed": 2,
        "pending": 0
    },
    "suites": [
        {
            "name": "Navigation Tests",
            "priority": "critical",
            "tests": [...]
        }
    ]
}
```

---

## 🌐 Browser Testing

### Supported Browsers

- ✅ Chrome (Latest)
- ✅ Firefox (Latest)
- ✅ Edge (Latest)
- ✅ Safari (Latest)
- ⚠️ Mobile Chrome (Basic support)
- ⚠️ Mobile Safari (Basic support)

### Cross-Browser Notes

**Chrome**: Full support, recommended for development  
**Firefox**: Full support, excellent debugging tools  
**Edge**: Full support, Chromium-based  
**Safari**: Full support, may need polyfills for some features  
**Mobile**: Touch interactions differ from desktop drag & drop

---

## 🔍 Troubleshooting

### Common Issues

**Issue**: Tests fail to load  
**Solution**: Check browser console for errors, ensure server is running

**Issue**: LocalStorage tests fail  
**Solution**: Enable cookies in browser settings

**Issue**: Performance tests fail  
**Solution**: Close other applications, clear browser cache

**Issue**: Tests timeout
**Solution**: Increase `testConfig.timeout` value

**Issue**: Performance benchmarks below target
**Solution**: Clear cache, test on fast network, close other tabs, run multiple times

**Issue**: Memory metric shows "N/A"
**Solution**: Use Chrome/Edge browser (Firefox/Safari don't support `performance.memory`)

**Issue**: Bundle size higher than expected
**Solution**: Verify code splitting is working, check for unnecessary module loads

---

## 📚 Related Documentation

### Testing Guides
- [Integration Testing Guide](../docs/INTEGRATION_TESTING_GUIDE.md) - Complete testing procedures
- [Performance Benchmark Guide](./PERFORMANCE_BENCHMARK_GUIDE.md) - Performance testing guide
- [Drag Drop Testing Guide](../docs/DRAG_DROP_TESTING.md) - Drag & drop specific tests

### Feature Documentation
- [State Persistence Feature](../docs/STATE_PERSISTENCE_FEATURE.md) - State management docs
- [Line Numbers Sync Feature](../docs/LINE_NUMBERS_SYNC_FEATURE.md) - Line numbers feature
- [Virtual Scrolling Implementation](../docs/VIRTUAL_SCROLLING_IMPLEMENTATION.md) - Virtual scroll docs

### Performance Documentation
- [Performance Optimization Summary](../docs/PERFORMANCE_OPTIMIZATION_SUMMARY.md) - Complete overview
- [Phase 2 Performance Optimizations](../docs/PHASE2_PERFORMANCE_OPTIMIZATIONS.md) - Phase 2 details
- [Phase 3 Performance Optimizations](../docs/PHASE3_PERFORMANCE_OPTIMIZATIONS.md) - Phase 3 details
- [Performance Quick Start](../docs/PERFORMANCE_QUICKSTART.md) - Quick reference

### Project Documentation
- [Progress Tracker](../docs/PROGRESS_TRACKER.md) - Project progress and milestones
- [Improvement Action Plan](../docs/IMPROVEMENT_ACTION_PLAN.md) - Future improvements
- [README](../docs/README.md) - Main documentation hub

---

## 🎓 Best Practices

### When Running Tests

1. **Clear Environment**
   - Clear browser cache
   - Clear localStorage
   - Close unnecessary tabs
   - Disable browser extensions (for accurate performance)

2. **Document Everything**
   - Take screenshots of failures
   - Copy console errors
   - Note browser version
   - Record steps to reproduce

3. **Test Systematically**
   - Run critical tests first
   - Test one feature at a time
   - Verify fixes before moving on
   - Regression test after fixes

4. **Report Accurately**
   - Use standard templates
   - Include all required info
   - Assign correct severity
   - Link related issues

---

## 📞 Support

### Need Help?

- **Documentation**: Check [docs/](../docs/) folder
- **Bug Template**: See [Integration Testing Guide](../docs/INTEGRATION_TESTING_GUIDE.md#bug-reporting)
- **Contact**: Development team

---

**Happy Testing! 🚀**

---

*Last Updated: 15 January 2025*  
*Test Suite Version: 1.0*  
*Maintained By: QA Team*